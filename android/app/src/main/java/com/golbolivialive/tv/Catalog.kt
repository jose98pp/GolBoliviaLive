package com.golbolivialive.tv

import org.json.JSONObject
import java.net.URI
import java.net.HttpURLConnection
import java.net.URL

data class TeamInfo(val id: String, val name: String, val crest: String = "", val color: String = "#15314D")
data class WatchSource(val provider: String, val url: String, val embedded: Boolean = false, val label: String = provider, val waitForBroadcast: Boolean = false, val id: String = "")
data class MatchStatus(val label: String, val category: String)
data class WatchItem(
    val id: String, val title: String, val subtitle: String, val live: Boolean,
    val sources: List<WatchSource>, val webPath: String, val channel: Boolean = false,
    val home: TeamInfo? = null, val away: TeamInfo? = null,
    val status: String = "TV · CANAL", val category: String = "channel", val score: String = "VS",
    val logo: String = "", val sport: String = "football", val competition: String = "",
    val competitionLogo: String = "", val result: String = "", val winner: String = "", val autoFailover: Boolean = true, val scheduledAt: String = "",
) {
    val streams: List<String> get() = sources.filter { !it.embedded }.map { it.url }
}

class CatalogHttpException(val status: Int, val code: String = "") : java.io.IOException("HTTP $status")

object Catalog {
    fun https(value: String): String? = runCatching {
        URI(value).takeIf { it.scheme == "https" && !it.host.isNullOrBlank() && it.userInfo == null }?.toString()
    }.getOrNull()

    fun embeddedSource(value: String, provider: String): WatchSource? {
        val url = https(value) ?: return null
        val uri = URI(url)
        val host = uri.host.lowercase()
        if (host in setOf("youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be")) {
            val video = when {
                host == "youtu.be" -> uri.path.trim('/')
                uri.path.startsWith("/embed/") || uri.path.startsWith("/live/") -> uri.path.substringAfterLast('/')
                else -> uri.rawQuery.orEmpty().split('&').firstOrNull { it.startsWith("v=") }?.substringAfter("v=").orEmpty()
            }
            return video.takeIf { it.matches(Regex("[A-Za-z0-9_-]{11}")) }?.let { WatchSource("YouTube", "https://www.youtube.com/embed/$it", true) }
        }
        if (host in setOf("player.kick.com", "kick.com", "www.kick.com")) {
            val channel = uri.path.trim('/')
            if (channel.matches(Regex("[A-Za-z0-9_-]{1,100}"))) return WatchSource("Kick", "https://player.kick.com/$channel", true)
        }
        return WatchSource(provider, url, true)
    }

    fun status(row: JSONObject): MatchStatus {
        SportsEvents.data(row)?.let { return SportsEvents.status(it) }
        if (row.optBoolean("espnSyncPending")) return MatchStatus("CONSULTANDO ESPN", "today")
        val period = row.optString("period", "1T").trim()
        val mode = row.optString("broadcastMode")
        val lower = period.lowercase()
        if (mode == "var" || lower.contains("var")) return MatchStatus("REVISIÓN VAR", "live")
        if (mode == "post_match" || lower.contains("finalizado") || lower.contains("terminado")) return MatchStatus("FINALIZADO", "finished")
        if (mode == "halftime" || lower.contains("descanso") || lower.contains("medio tiempo")) return MatchStatus("ENTRETIEMPO", "live")
        if (mode == "pre_match" || !row.optBoolean("isLive") || lower.contains("previa") || lower.contains("programado") ||
            (mode == "simulation" && row.optInt("matchMinute") == 0 && !row.optBoolean("isClockRunning") && row.optInt("homeScore") == 0 && row.optInt("awayScore") == 0 && period == "1T"))
            return MatchStatus("PROGRAMADO", "today")
        val clock = row.optString("displayClock").ifBlank { row.optInt("matchMinute").takeIf { it > 0 }?.let { "$it′" }.orEmpty() }
        return MatchStatus(listOf("EN VIVO", period, clock).filter { it.isNotBlank() }.joinToString(" · "), "live")
    }

    private fun eventSources(row: JSONObject): List<WatchSource>? {
        val entries = row.optJSONArray("sources") ?: return null
        val sources = (0 until minOf(entries.length(), 20)).mapNotNull { index ->
            val value = entries.optJSONObject(index) ?: return@mapNotNull null
            val url = value.optString("url")
            val source = when (value.optString("type")) {
                "hls", "dash" -> https(url)?.let { WatchSource(if (value.optString("type") == "dash") "DASH" else "HLS", it) }
                "iframe" -> embeddedSource(url, "Web")
                "youtube" -> embeddedSource(if (url.matches(Regex("[A-Za-z0-9_-]{11}"))) "https://www.youtube.com/embed/$url" else url, "YouTube")
                "kick" -> embeddedSource(if (url.matches(Regex("[A-Za-z0-9_-]{1,80}"))) "https://kick.com/$url" else url, "Kick")
                else -> null
            } ?: return@mapNotNull null
            source.copy(id = value.optString("id"), label = value.optString("name").take(80).ifBlank { source.provider },
                waitForBroadcast = value.optString("type") == "hls" && value.optBoolean("waitForBroadcast"))
        }.distinctBy { it.url to it.embedded }
        val initial = row.optString("defaultSourceId")
        return sources.sortedBy { if (it.id == initial) 0 else 1 }
    }

    fun matches(json: JSONObject, teams: Map<String, TeamInfo> = emptyMap()): List<WatchItem> {
        val rows = json.getJSONArray("events")
        return (0 until rows.length()).mapNotNull { index ->
            val row = rows.getJSONObject(index)
            val sports = SportsEvents.data(row)
            if (!row.isNull("sports") && sports == null) return@mapNotNull null
            val primary = row.optString("primaryProvider", "cloudflare")
            val explicitSources = eventSources(row)
            val failover = row.optBoolean("autoFailoverEnabled", explicitSources == null)
            val providers = if (failover) listOf(primary) + row.optJSONArray("fallbackOrder").let { a ->
                if (a == null) emptyList() else (0 until a.length()).map { a.optString(it) }
            } else listOf(primary)
            val sources = mutableListOf<WatchSource>()
            fun add(provider: String, value: String, embed: Boolean = false) {
                val candidate = if (embed) embeddedSource(value, provider) else https(value)?.let { WatchSource(provider, it) }
                if (candidate != null && sources.none { it.url == candidate.url && it.embedded == candidate.embedded }) sources.add(candidate)
            }
            val backupActive = row.optString("activeStreamSource") == "backup"
            val simulation = row.optString("activeStreamSource") == "simulation"
            if (!simulation) {
                if (backupActive) add("Respaldo", row.optString("backupVideoUrl"))
                if (!backupActive || failover) providers.distinct().forEach { provider ->
                    when (provider) {
                        "cloudflare" -> add("HLS", https(row.optString("customVideoUrl")) ?: row.optJSONObject("cloudflare")?.optString("playbackUrl").orEmpty())
                        "iptv" -> row.optJSONObject("iptvSource")?.let { add("Canal", it.optString("streamUrl"), it.optString("sourceType") == "iframe") }
                        "external" -> add("Web", row.optJSONObject("externalSource")?.optString("url").orEmpty(), true)
                        "youtube" -> row.optJSONObject("youtube")?.optString("videoId")?.takeIf { it.matches(Regex("[A-Za-z0-9_-]{11}")) }?.let {
                            add("YouTube", "https://www.youtube.com/embed/$it", true)
                        }
                        "kick" -> row.optJSONObject("kick")?.optString("channel")?.takeIf { it.matches(Regex("[A-Za-z0-9_-]{1,100}")) }?.let {
                            add("Kick", "https://player.kick.com/$it", true)
                        }
                    }
                }
                if (failover) add("Respaldo", row.optString("backupVideoUrl"))
            }
            if (explicitSources != null) { sources.clear(); sources.addAll(explicitSources) }
            val id = row.getString("id")
            fun team(field: String, side: Int): TeamInfo {
                if (sports != null) {
                    val participant = sports.getJSONArray("participants").getJSONObject(side)
                    return TeamInfo("$id:$side", participant.getString("name"), SportsEvents.image(participant.optString("imageUrl")))
                }
                val raw = row.optString(field)
                val team = teams[raw] ?: TeamInfo(raw, raw.replace('_', ' ').ifBlank { "Equipo por confirmar" })
                return if (team.crest.isBlank()) team.copy(crest = SportsEvents.image(row.optString(if (side == 0) "espnHomeLogo" else "espnAwayLogo"))) else team
            }
            val home = team("homeTeam", 0); val away = team("awayTeam", 1)
            val state = status(row)
            val sport = sports?.optString("sport") ?: "football"
            val score = if (sports != null) {
                if (sport == "mma" || sports.optString("state") in listOf("pre", "cancelled", "postponed")) "VS"
                else (0..1).joinToString(" – ") { SportsEvents.score(sports.getJSONArray("participants").getJSONObject(it))?.toString() ?: "—" }
            } else if (state.category != "today" && !row.isNull("homeScore") && !row.isNull("awayScore"))
                "${row.optInt("homeScore")} – ${row.optInt("awayScore")}" else "VS"
            val competition = sports?.optString("competition") ?: row.optString("tournamentName").ifBlank { row.optString("espnCompetitionName") }
            val winner = if (sports?.optString("state") == "final") (0..1).map { sports.getJSONArray("participants").getJSONObject(it) }
                .filter { it.optBoolean("winner") }.joinToString(" / ") { it.optString("name") } else ""
            WatchItem("match:$id", row.optString("title").ifBlank { "${home.name} vs ${away.name}" },
                listOf(competition, row.optString("stadiumName")).filter { it.isNotBlank() }.joinToString(" · "),
                state.category == "live", sources, "/live/${encode(id)}", home = home, away = away,
                status = state.label + if (row.optBoolean(if (sports != null) "sportsSyncFailed" else "espnSyncFailed")) " · ESPN sin actualizar" else "",
                category = state.category, score = score, sport = sport, competition = competition,
                competitionLogo = SportsEvents.image(sports?.optString("competitionLogo") ?: row.optString("espnCompetitionLogo")),
                result = sports?.optString("result").orEmpty(), winner = winner, autoFailover = failover,
                scheduledAt = row.optString("scheduledAt").takeIf { EventSchedule.timestamp(it) != null }
                    ?: sports?.optString("scheduledAt").orEmpty())

        }.sortedBy { EventSchedule.timestamp(it.scheduledAt) ?: Long.MAX_VALUE }
    }

    fun channels(json: JSONObject): List<WatchItem> {
        val rows = json.getJSONArray("channels")
        return (0 until rows.length()).map { index ->
            val row = rows.getJSONObject(index)
            val id = row.getString("id")
            val source = if (row.optString("sourceType") == "iframe") embeddedSource(row.optString("streamUrl"), "Canal")
                else https(row.optString("streamUrl"))?.let { WatchSource("Canal", it) }
            WatchItem("channel:$id", row.optString("name"),
                listOf(row.optString("countryName"), row.optString("group")).filter { it.isNotBlank() }.distinct().joinToString(" · "),
                false, listOfNotNull(source), "/tv/${encode(id)}", true, logo = listOf("logo", "logoUrl", "imageUrl", "tvgLogo").firstNotNullOfOrNull { key -> ImageUrls.normalize(row.optString(key)).takeIf { it.isNotBlank() } }.orEmpty())
        }
    }

    private fun encode(value: String) = java.net.URLEncoder.encode(value, "UTF-8").replace("+", "%20")

    fun fetch(path: String, timeoutMs: Int = 20000): JSONObject {
        val connection = URL(BuildConfig.PUBLIC_BASE_URL + path).openConnection() as HttpURLConnection
        connection.connectTimeout = minOf(15000, timeoutMs)
        connection.readTimeout = timeoutMs
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("Cache-Control", "no-cache")
        try {
            if (connection.responseCode !in 200..299) {
                val code = runCatching { JSONObject(connection.errorStream?.bufferedReader()?.use { it.readText().take(65536) }.orEmpty()).optString("code") }.getOrDefault("")
                throw CatalogHttpException(connection.responseCode, code)
            }
            return connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
        } finally { connection.disconnect() }
    }
}
