package com.golbolivialive.tv

import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale

object SportsEvents {
    private val competitions = mapOf("nba" to "basketball", "wnba" to "basketball",
        "mens-college-basketball" to "basketball", "womens-college-basketball" to "basketball", "ufc" to "mma")
    private val states = mapOf("pre" to "PROGRAMADO", "live" to "EN VIVO", "break" to "DESCANSO",
        "final" to "FINALIZADO", "postponed" to "APLAZADO", "cancelled" to "CANCELADO")
    private val updates = mutableMapOf<String, JSONObject>()
    private val failed = mutableSetOf<String>()

    fun image(value: String): String = value.takeIf { it.length <= 1500 }?.let { Catalog.https(it) }.orEmpty()

    fun data(row: JSONObject): JSONObject? {
        val value = row.optJSONObject("sports") ?: return null
        val participants = value.optJSONArray("participants") ?: return null
        if (value.optString("sport") !in listOf("basketball", "mma", "other") ||
            value.optString("state") !in states || participants.length() != 2 ||
            (0..1).any { participants.optJSONObject(it)?.optString("name").isNullOrBlank() }) return null
        return value
    }

    fun status(sports: JSONObject): MatchStatus {
        val state = sports.optString("state")
        return MatchStatus(listOf(states[state].orEmpty(), sports.optString("phase"), sports.optString("clock"))
            .filter { it.isNotBlank() }.joinToString(" · "),
            when (state) { "live", "break" -> "live"; "final", "cancelled" -> "finished"; else -> "today" })
    }

    fun score(participant: JSONObject): Int? {
        val raw = participant.opt("score")
        val value = if (raw is JSONObject) raw.opt("value") ?: raw.opt("displayValue") else raw
        val number = value?.toString()?.toDoubleOrNull() ?: return null
        return number.takeIf { it.isFinite() && it in 0.0..1000.0 && it % 1 == 0.0 }?.toInt()
    }

    private fun source(sports: JSONObject): JSONObject? {
        val link = sports.optJSONObject("source") ?: return null
        val competition = link.optString("competition")
        if (!link.optBoolean("enabled") || competitions[competition] != sports.optString("sport") ||
            !link.optString("eventId").matches(Regex("[0-9]{1,20}"))) return null
        val bout = link.optString("boutId")
        if ((competition == "ufc" || bout.isNotBlank()) && !bout.matches(Regex("[0-9]{1,20}"))) return null
        val date = link.optString("date")
        if (date.isNotBlank()) {
            if (!date.matches(Regex("[0-9]{4}-[0-9]{2}-[0-9]{2}"))) return null
            val format = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply { isLenient = false }
            if (runCatching { format.parse(date) }.getOrNull() == null) return null
        }
        return link
    }

    fun requestPath(sports: JSONObject): String? = source(sports)?.let { path(it) }

    private fun key(link: JSONObject) = listOf("competition", "eventId", "boutId", "date").joinToString(":") { link.optString(it) }

    fun path(link: JSONObject): String = "/api/sports-api/event?competition=${link.getString("competition")}&eventId=${link.getString("eventId")}" +
        link.optString("boutId").takeIf { it.isNotBlank() }?.let { "&boutId=$it" }.orEmpty() +
        link.optString("date").takeIf { it.isNotBlank() }?.let { "&date=$it" }.orEmpty()

    fun parse(raw: JSONObject, saved: JSONObject): JSONObject? {
        val link = source(saved) ?: return null
        val header = raw.optJSONObject("header")
        val events = if (header != null) JSONArray().put(header) else raw.optJSONArray("events") ?: return null
        val candidates = mutableListOf<Pair<JSONObject, JSONObject>>()
        for (i in 0 until events.length()) {
            val event = events.optJSONObject(i) ?: continue
            if (event.optString("id") != link.optString("eventId")) continue
            val bouts = event.optJSONArray("competitions") ?: continue
            for (j in 0 until bouts.length()) {
                val bout = bouts.optJSONObject(j) ?: continue
                if (link.optString("boutId").isNotBlank() && bout.optString("id") != link.optString("boutId")) continue
                candidates.add(event to bout)
            }
        }
        if (candidates.size != 1) return null
        val (event, bout) = candidates.single()
        val competitors = bout.optJSONArray("competitors") ?: return null
        if (competitors.length() != 2) return null
        val status = bout.optJSONObject("status") ?: event.optJSONObject("status") ?: return null
        val type = status.optJSONObject("type") ?: return null
        val name = type.optString("name").uppercase()
        val state = when {
            "CANCEL" in name -> "cancelled"
            Regex("POSTPON|DELAY").containsMatchIn(name) -> "postponed"
            type.optBoolean("completed") || type.optString("state") == "post" -> "final"
            Regex("HALFTIME|END_PERIOD|INTERMISSION|BREAK").containsMatchIn(name) -> "break"
            type.optString("state") == "in" -> "live"
            type.optString("state") == "pre" -> "pre"
            else -> return null
        }
        val sport = saved.optString("sport")
        val ordered = (0..1).map { competitors.optJSONObject(it) ?: return null }.let { rows ->
            if (sport == "basketball") {
                if (rows.count { it.optString("homeAway") == "home" } != 1 || rows.count { it.optString("homeAway") == "away" } != 1) return null
                rows.sortedBy { if (it.optString("homeAway") == "home") 0 else 1 }
            } else rows
        }
        val participants = JSONArray()
        for (competitor in ordered) {
            val identity = competitor.optJSONObject(if (sport == "mma") "athlete" else "team") ?: return null
            val personName = identity.optString("displayName").ifBlank { identity.optString("fullName").ifBlank { identity.optString("name") } }
            if (personName.isBlank()) return null
            val photo = identity.optJSONObject("headshot")?.optString("href")
                ?: identity.opt("headshot")?.takeIf { it is String }?.toString()
                ?: identity.optString("logo").ifBlank { identity.optJSONArray("logos")?.optJSONObject(0)?.optString("href").orEmpty() }
            val participant = JSONObject().put("name", personName).put("imageUrl", image(photo))
            if (sport == "basketball") score(competitor)?.let { participant.put("score", it) }
            if (competitor.opt("winner") is Boolean) participant.put("winner", competitor.getBoolean("winner"))
            participants.put(participant)
        }
        val period = status.optInt("period")
        val halves = link.optString("competition") == "mens-college-basketball"
        val phase = if (period <= 0) "" else if (sport == "mma") "Round $period"
            else if (period > if (halves) 2 else 4) "Prórroga" else if (halves) "${period}ª mitad" else "${period}º cuarto"
        val logo = raw.optJSONArray("leagues")?.optJSONObject(0)?.optJSONArray("logos")?.optJSONObject(0)?.optString("href")
            ?: header?.optJSONObject("league")?.optJSONArray("logos")?.optJSONObject(0)?.optString("href").orEmpty()
        return JSONObject().put("sport", sport).put("competition", saved.optString("competition"))
            .put("competitionLogo", image(logo)).put("participants", participants).put("state", state)
            .put("phase", phase).put("clock", status.optString("displayClock"))
            .put("result", if (state == "final") bout.optJSONObject("details")?.optString("text").orEmpty()
                .ifBlank { type.optString("shortDetail").ifBlank { type.optString("detail").ifBlank { type.optString("description") } } } else "")
            .put("source", JSONObject(link.toString()))
    }

    private fun overlay(saved: JSONObject, update: JSONObject): JSONObject {
        val result = JSONObject(update.toString())
        result.put("competition", saved.optString("competition"))
        result.put("competitionLogo", image(saved.optString("competitionLogo")).ifBlank { image(update.optString("competitionLogo")) })
        result.put("source", saved.optJSONObject("source"))
        for (i in 0..1) {
            val before = saved.getJSONArray("participants").getJSONObject(i)
            val after = result.getJSONArray("participants").getJSONObject(i)
            if (before.optString("name") == after.optString("name")) image(before.optString("imageUrl"))
                .takeIf { it.isNotBlank() }?.let { after.put("imageUrl", it) }
        }
        return result
    }

    fun preview(events: JSONObject): JSONObject = apply(events, null)
    fun refresh(events: JSONObject, fetch: (String) -> JSONObject = { Catalog.fetch(it, 12000) }): JSONObject = apply(events, fetch)

    private fun apply(events: JSONObject, fetch: ((String) -> JSONObject)?): JSONObject {
        val result = JSONObject(events.toString())
        val rows = result.getJSONArray("events")
        val requested = mutableMapOf<String, JSONObject?>()
        val active = mutableSetOf<String>()
        for (i in 0 until rows.length()) {
            val row = rows.getJSONObject(i)
            val saved = data(row) ?: continue
            val link = source(saved) ?: continue
            val key = key(link); active.add(key)
            if (fetch != null) {
                if (!requested.containsKey(key)) requested[key] = runCatching { parse(fetch(path(link)), saved) }.getOrNull()
                val current = requested[key]
                if (current != null) { updates[key] = current; failed.remove(key) } else failed.add(key)
            }
            updates[key]?.let { row.put("sports", overlay(saved, it)) }
            row.put("sportsSyncFailed", key in failed)
        }
        if (fetch != null) { updates.keys.retainAll(active); failed.retainAll(active) }
        return result
    }
}
