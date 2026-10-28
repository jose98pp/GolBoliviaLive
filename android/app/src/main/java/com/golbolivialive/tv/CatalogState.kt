package com.golbolivialive.tv

import org.json.JSONArray
import org.json.JSONObject

class CatalogState {
    var events = JSONObject().put("events", JSONArray())
        private set
    var baseEvents = JSONObject().put("events", JSONArray())
        private set
    var revision = 0
        private set
    private var pendingRemoval: Set<String>? = null

    private fun canonical(value: Any?): String = when (value) {
        is JSONObject -> value.keys().asSequence().sorted().joinToString(prefix = "{", postfix = "}") { JSONObject.quote(it) + ":" + canonical(value.opt(it)) }
        is JSONArray -> (0 until value.length()).joinToString(prefix = "[", postfix = "]") { canonical(value.opt(it)) }
        is String -> JSONObject.quote(value)
        else -> value?.toString().orEmpty()
    }
    private fun indexed(value: JSONObject): Map<String, JSONObject> {
        val rows = value.getJSONArray("events")
        return (0 until rows.length()).associate { rows.getJSONObject(it).getString("id") to rows.getJSONObject(it) }
    }

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
        val previous = indexed(events)
        val previousBase = indexed(baseEvents)
        val authoritative = response.optBoolean("catalogConfirmed") && !response.optBoolean("stale")
        if (incoming.isEmpty() && !authoritative) { pendingRemoval = null; return false }
        val removed = previous.keys - incoming.keys
        val remove = authoritative || (incoming.isNotEmpty() && !response.optBoolean("stale") && pendingRemoval == incoming.keys)
        pendingRemoval = if (removed.isNotEmpty() && !remove && !response.optBoolean("stale")) incoming.keys.toSet() else null
        val merged = linkedMapOf<String, JSONObject>()
        val bases = linkedMapOf<String, JSONObject>()
        incoming.forEach { (id, row) ->
            val old = previousBase[id]
            val oldTime = old?.optLong("updatedAt") ?: 0
            val time = row.optLong("updatedAt")
            val older = old != null && when {
                oldTime > 0 && time > 0 && oldTime != time -> oldTime > time
                else -> old.optLong("version") > row.optLong("version")
            }
            bases[id] = if (older) old!! else row
            merged[id] = if (older || (old != null && canonical(old) == canonical(row))) previous[id] ?: row else row
        }
        if (!remove) previous.forEach { (id, row) -> if (id !in merged) { merged[id] = row; bases[id] = previousBase[id] ?: row } }
        baseEvents = JSONObject(response.toString()).put("events", JSONArray(bases.values.toList()))
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
