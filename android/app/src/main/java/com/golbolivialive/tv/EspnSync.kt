package com.golbolivialive.tv

import org.json.JSONObject

object EspnSync {
    private val updates = mutableMapOf<String, JSONObject>()
    private val failedKeys = mutableSetOf<String>()

    fun preview(events: JSONObject): JSONObject {
        val result = JSONObject(events.toString())
        val rows = result.getJSONArray("events")
        for (i in 0 until rows.length()) {
            val row = rows.getJSONObject(i)
            if (!row.isNull("sports")) continue
            val link = row.optJSONObject("espnLink") ?: continue
            val id = link.optString("eventId"); val league = link.optString("league")
            if (!link.optBoolean("enabled") || !id.matches(Regex("[0-9]{1,20}")) || !league.matches(Regex("[a-z0-9._-]{2,60}"))) continue
            val key = "$league:$id"
            val update = updates[key]
            update?.keys()?.forEach { row.put(it, update.get(it)) }
            row.put("espnSyncPending", update == null).put("espnSyncFailed", key in failedKeys)
        }
        return result
    }

    fun parse(summary: JSONObject, eventId: String): JSONObject? {
        val header = summary.optJSONObject("header") ?: return null
        if (header.optString("id") != eventId) return null
        val competition = header.optJSONArray("competitions")?.optJSONObject(0) ?: return null
        val status = competition.optJSONObject("status") ?: header.optJSONObject("status") ?: return null
        val type = status.optJSONObject("type") ?: return null
        val state = type.optString("state")
        if (state !in listOf("pre", "in", "post") && !type.optBoolean("completed")) return null
        val teams = competition.optJSONArray("competitors") ?: return null
        val competitors = (0 until teams.length()).mapNotNull { teams.optJSONObject(it) }
        val home = competitors.find { it.optString("homeAway") == "home" } ?: return null
        val away = competitors.find { it.optString("homeAway") == "away" } ?: return null
        val finished = type.optBoolean("completed") || state == "post"
        val live = !finished && state == "in"
        val halftime = !finished && Regex("HALFTIME|HALF_TIME|INTERMISSION").containsMatchIn(type.optString("name").uppercase())
        val clock = status.optString("displayClock")
        val parts = Regex("^(\\d+)(?:['’′])?(?:\\s*\\+\\s*(\\d+))?").find(clock)
        val minute = parts?.let { (it.groupValues[1].toIntOrNull() ?: 0) + (it.groupValues[2].toIntOrNull() ?: 0) }
            ?: (status.optDouble("clock", 0.0).coerceAtLeast(0.0) / 60).toInt()
        fun score(team: JSONObject): Any {
            val value = team.opt("score")
            val raw = if (value is JSONObject) value.optString("displayValue").ifBlank { value.optString("value") } else value?.toString().orEmpty()
            return raw.toDoubleOrNull()?.takeIf { it.isFinite() }?.toInt()?.coerceAtLeast(0) ?: JSONObject.NULL
        }
        fun logo(team: JSONObject): String {
            val identity = team.optJSONObject("team") ?: return ""
            return SportsEvents.image(identity.optString("logo").ifBlank { identity.optJSONArray("logos")?.optJSONObject(0)?.optString("href").orEmpty() })
        }
        val league = header.optJSONObject("league")
        return JSONObject().put("espnHomeLogo", logo(home)).put("espnAwayLogo", logo(away))
            .put("espnCompetitionName", league?.optString("name").orEmpty())
            .put("espnCompetitionLogo", SportsEvents.image(league?.optJSONArray("logos")?.optJSONObject(0)?.optString("href")
                ?: league?.optString("logo").orEmpty()))
            .put("homeScore", score(home)).put("awayScore", score(away))
            .put("isLive", live).put("isClockRunning", live && !halftime).put("displayClock", clock).put("matchMinute", minute)
            .put("period", when { finished -> "Finalizado"; halftime -> "Descanso"; status.optInt("period") > 2 -> "Tiempo Extra"; status.optInt("period") == 2 -> "2T"; else -> "1T" })
            .put("broadcastMode", when { finished -> "post_match"; halftime -> "halftime"; live -> "obs_custom"; else -> "pre_match" })
    }

    fun refresh(events: JSONObject, fetch: (String) -> JSONObject = { Catalog.fetch(it, 12000) }): JSONObject {
        val result = JSONObject(events.toString())
        val rows = result.getJSONArray("events")
        val requested = mutableMapOf<String, JSONObject?>()
        val activeKeys = mutableSetOf<String>()
        for (i in 0 until rows.length()) {
            val row = rows.getJSONObject(i)
            if (!row.isNull("sports")) continue
            val link = row.optJSONObject("espnLink") ?: continue
            if (!link.optBoolean("enabled")) continue
            val id = link.optString("eventId"); val league = link.optString("league")
            if (!id.matches(Regex("[0-9]{1,20}")) || !league.matches(Regex("[a-z0-9._-]{2,60}"))) continue
            val key = "$league:$id"
            activeKeys.add(key)
            if (!requested.containsKey(key)) requested[key] = runCatching { parse(fetch("/api/football-api/match/$id?league=$league"), id) }.getOrNull()
            val current = requested[key]
            if (current != null) { updates[key] = current; failedKeys.remove(key) } else failedKeys.add(key)
            val update = current ?: updates[key]
            update?.keys()?.forEach { field -> row.put(field, update.get(field)) }
            row.put("espnSyncFailed", current == null).put("espnSyncPending", false)
        }
        updates.keys.retainAll(activeKeys)
        failedKeys.retainAll(activeKeys)
        return result
    }
}
