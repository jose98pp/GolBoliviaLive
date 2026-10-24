package com.golbolivialive.tv

import org.json.JSONObject
import java.util.concurrent.ExecutorCompletionService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class EventEnricher(private val fetch: (String) -> JSONObject = { Catalog.fetch(it, 4000) },
    private val budgetMs: Long = 7000) {
    private val pool = Executors.newFixedThreadPool(3)

    fun refresh(events: JSONObject): JSONObject {
        val paths = linkedSetOf<String>()
        val rows = events.getJSONArray("events")
        for (i in 0 until rows.length()) {
            val row = rows.getJSONObject(i)
            val sports = SportsEvents.data(row)
            if (sports != null) SportsEvents.requestPath(sports)?.let { paths.add(it) }
            else if (row.isNull("sports")) row.optJSONObject("espnLink")?.let { link ->
                val id = link.optString("eventId"); val league = link.optString("league")
                if (link.optBoolean("enabled") && id.matches(Regex("[0-9]{1,20}")) && league.matches(Regex("[a-z0-9._-]{2,60}")))
                    paths.add("/api/football-api/match/$id?league=$league")
            }
        }
        val completed = ExecutorCompletionService<Pair<String, JSONObject?>>(pool)
        val tasks = paths.map { path -> completed.submit(java.util.concurrent.Callable { path to runCatching { fetch(path) }.getOrNull() }) }
        val responses = mutableMapOf<String, JSONObject>()
        val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(budgetMs)
        try {
            var remaining = tasks.size
            while (remaining > 0) {
                val time = deadline - System.nanoTime()
                if (time <= 0) break
                val result = completed.poll(time, TimeUnit.NANOSECONDS)?.get() ?: break
                result.second?.let { responses[result.first] = it }
                remaining--
            }
        } finally { tasks.forEach { if (!it.isDone) it.cancel(true) } }
        val available: (String) -> JSONObject = { responses[it] ?: throw java.io.IOException("ESPN fuera del plazo de actualización") }
        return SportsEvents.refresh(EspnSync.refresh(events, available), available)
    }

    fun close() { pool.shutdownNow() }
}
