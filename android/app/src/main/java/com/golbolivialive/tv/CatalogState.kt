package com.golbolivialive.tv

import org.json.JSONArray
import org.json.JSONObject

class CatalogState {
    var events = JSONObject().put("events", JSONArray())
        private set
    var revision = 0
        private set
    private var pendingRemoval: Set<String>? = null

    fun accept(response: JSONObject): Boolean {
        require(response.opt("success") != false) { "Unconfirmed catalog" }
        val rows = response.getJSONArray("events")
        val incoming = linkedMapOf<String, JSONObject>()
        for (i in 0 until rows.length()) {
            val row = rows.getJSONObject(i)
            val id = row.getString("id")
            require(id.isNotBlank() && !incoming.containsKey(id)) { "Invalid event ID" }
            require(row.isNull("sports") || SportsEvents.data(row) != null) { "Incomplete sports event" }
            incoming[id] = JSONObject(row.toString())
        }
        val before = events.getJSONArray("events")
        val previous = (0 until before.length()).associate { before.getJSONObject(it).getString("id") to before.getJSONObject(it) }
        val authoritative = response.optBoolean("catalogConfirmed") && !response.optBoolean("stale")
        if (incoming.isEmpty() && !authoritative) { pendingRemoval = null; return false }
        val removed = previous.keys - incoming.keys
        val remove = authoritative || (incoming.isNotEmpty() && !response.optBoolean("stale") && pendingRemoval == incoming.keys)
        pendingRemoval = if (removed.isNotEmpty() && !remove && !response.optBoolean("stale")) incoming.keys.toSet() else null
        val merged = linkedMapOf<String, JSONObject>()
        incoming.forEach { (id, row) ->
            val old = previous[id]
            val older = old != null && (old.optLong("version") > row.optLong("version") ||
                (old.optLong("version") == row.optLong("version") && old.optLong("updatedAt") > row.optLong("updatedAt")) ||
                (old.optLong("version") > 0 && old.optLong("version") == row.optLong("version") && old.optLong("updatedAt") == row.optLong("updatedAt")))
            merged[id] = if (older) old!! else row
        }
        if (!remove) previous.forEach { (id, row) -> if (id !in merged) merged[id] = row }
        events = JSONObject(response.toString()).put("events", JSONArray(merged.values.toList()))
        revision++
        return true
    }

    fun enrich(value: JSONObject, expectedRevision: Int): Boolean {
        if (revision != expectedRevision) return false
        events = JSONObject(value.toString())
        return true
    }
}
