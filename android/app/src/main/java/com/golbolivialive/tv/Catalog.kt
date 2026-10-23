package com.golbolivialive.tv

import org.json.JSONObject
import java.net.URI
import java.net.HttpURLConnection
import java.net.URL

data class WatchItem(
    val id: String, val title: String, val subtitle: String, val live: Boolean,
    val streams: List<String>, val webPath: String, val channel: Boolean = false,
)

object Catalog {
    fun https(value: String): String? = runCatching {
        URI(value).takeIf { it.scheme == "https" && !it.host.isNullOrBlank() && it.userInfo == null }?.toString()
    }.getOrNull()

    fun matches(json: JSONObject): List<WatchItem> {
        val rows = json.getJSONArray("events")
        return (0 until rows.length()).map { index ->
            val row = rows.getJSONObject(index)
            val primary = row.optString("primaryProvider", "cloudflare")
            val sources = mutableListOf<String>()
            fun add(value: String) { https(value)?.let { if (it !in sources) sources.add(it) } }
            val backup = row.optString("backupVideoUrl")
            val backupActive = row.optString("activeStreamSource") == "backup"
            val failover = row.optBoolean("autoFailoverEnabled", true)
            val simulation = row.optString("activeStreamSource") == "simulation"
            if (backupActive && primary in listOf("iptv", "cloudflare")) add(backup)
            if (!simulation && (!backupActive || failover) && primary == "cloudflare") {
                add(https(row.optString("customVideoUrl"))
                    ?: row.optJSONObject("cloudflare")?.optString("playbackUrl").orEmpty())
            }
            if (!simulation && (!backupActive || failover) && primary == "iptv") {
                row.optJSONObject("iptvSource")?.let {
                    if (it.optString("sourceType") != "iframe") add(it.optString("streamUrl"))
                }
            }
            if (!simulation && failover && primary in listOf("iptv", "cloudflare")) add(backup)
            val id = row.getString("id")
            WatchItem("match:$id", row.optString("title").ifBlank {
                "${row.optString("homeTeam")} vs ${row.optString("awayTeam")}" },
                listOf(row.optString("tournamentName"), row.optString("stadiumName"))
                    .filter { it.isNotBlank() }.joinToString(" · "),
                row.optBoolean("isLive"), sources, "/live/${encode(id)}")
        }
    }

    fun channels(json: JSONObject): List<WatchItem> {
        val rows = json.getJSONArray("channels")
        return (0 until rows.length()).map { index ->
            val row = rows.getJSONObject(index)
            val id = row.getString("id")
            val url = if (row.optString("sourceType") == "iframe") null else https(row.optString("streamUrl"))
            WatchItem("channel:$id", row.optString("name"),
                listOf(row.optString("countryName"), row.optString("group"))
                    .filter { it.isNotBlank() }.distinct().joinToString(" · "),
                false, listOfNotNull(url), "/tv/${encode(id)}", true)
        }
    }

    private fun encode(value: String) = java.net.URLEncoder.encode(value, "UTF-8").replace("+", "%20")

    fun fetch(path: String): JSONObject {
        val connection = URL(BuildConfig.PUBLIC_BASE_URL + path).openConnection() as HttpURLConnection
        connection.connectTimeout = 15000
        connection.readTimeout = 20000
        connection.setRequestProperty("Accept", "application/json")
        connection.setRequestProperty("Cache-Control", "no-cache")
        try {
            check(connection.responseCode in 200..299) { "El servidor respondió HTTP ${connection.responseCode}" }
            return connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
        } finally { connection.disconnect() }
    }
}
