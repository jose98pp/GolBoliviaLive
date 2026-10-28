package com.golbolivialive.tv

import org.json.JSONArray
import org.json.JSONObject

data class PlaybackSnapshot(val item: WatchItem, val sourceIndex: Int, val playWhenReady: Boolean) {
    fun encode(): String {
        fun team(value: TeamInfo?): Any = value?.let { JSONObject().put("id", it.id).put("name", it.name).put("crest", it.crest).put("color", it.color) } ?: JSONObject.NULL
        return JSONObject().put("id", item.id).put("title", item.title).put("subtitle", item.subtitle)
            .put("live", item.live).put("channel", item.channel).put("webPath", item.webPath)
            .put("home", team(item.home)).put("away", team(item.away)).put("status", item.status)
            .put("category", item.category).put("score", item.score).put("logo", item.logo)
            .put("sport", item.sport).put("competition", item.competition).put("competitionLogo", item.competitionLogo)
            .put("scheduledAt", item.scheduledAt).put("result", item.result).put("winner", item.winner).put("autoFailover", item.autoFailover)
            .put("sources", JSONArray(item.sources.map { JSONObject().put("provider", it.provider).put("url", it.url).put("embedded", it.embedded).put("label", it.label).put("waitForBroadcast", it.waitForBroadcast).put("sourceId", it.id) }))
            .put("sourceIndex", sourceIndex).put("playWhenReady", playWhenReady).toString()
    }

    companion object {
        fun decode(value: String?): PlaybackSnapshot? = runCatching {
            val row = JSONObject(value ?: return null)
            fun team(field: String): TeamInfo? = row.optJSONObject(field)?.let {
                TeamInfo(it.getString("id"), it.getString("name"), it.optString("crest"), it.optString("color", "#15314D"))
            }
            val rows = row.getJSONArray("sources")
            val sources = (0 until rows.length()).map { index ->
                val source = rows.getJSONObject(index)
                val url = Catalog.https(source.getString("url")) ?: error("Invalid playback URL")
                WatchSource(source.getString("provider"), url, source.optBoolean("embedded"), source.optString("label").ifBlank { source.getString("provider") }, source.optBoolean("waitForBroadcast"), source.optString("sourceId"))
            }
            require(sources.isNotEmpty())
            val item = WatchItem(row.getString("id"), row.getString("title"), row.optString("subtitle"), row.optBoolean("live"),
                sources, row.optString("webPath"), row.optBoolean("channel"), team("home"), team("away"),
                row.optString("status"), row.optString("category"), row.optString("score"), ImageUrls.normalize(row.optString("logo")),
                row.optString("sport", "football"), row.optString("competition"), SportsEvents.image(row.optString("competitionLogo")), row.optString("result"), row.optString("winner"), row.optBoolean("autoFailover", true), row.optString("scheduledAt"))
            PlaybackSnapshot(item, row.optInt("sourceIndex").coerceIn(sources.indices), row.optBoolean("playWhenReady"))
        }.getOrNull()
    }
}
