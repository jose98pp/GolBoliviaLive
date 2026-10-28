package com.golbolivialive.tv

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

class EventEnricherTest {
    private fun row(id: String) = JSONObject().put("id", id).put("espnLink", JSONObject().put("enabled", true).put("league", "bol.1").put("eventId", id))
    private fun summary(id: String) = JSONObject("""{"header":{"id":"$id","competitions":[{"status":{"type":{"state":"in"},"displayClock":"45","period":1},"competitors":[{"homeAway":"home","score":"2"},{"homeAway":"away","score":"1"}]}]}}""")
    @Test fun fastMatchUpdatesEvenWhenAnotherEspnRequestStalls() {
        val release = CountDownLatch(1); val started = CountDownLatch(1)
        val worker = Executors.newSingleThreadExecutor()
        val enricher = EventEnricher({ path ->
            if (path.contains("/11?")) { started.countDown(); release.await(); summary("11") } else summary("12")
        }, 250)
        try {
            val future = worker.submit<JSONObject> { enricher.refresh(JSONObject().put("events", JSONArray().put(row("11")).put(row("12")))) }
            assertTrue(started.await(2, TimeUnit.SECONDS))
            val result = future.get(3, TimeUnit.SECONDS)
            assertTrue(result.getJSONArray("events").getJSONObject(1).getBoolean("isLive"))
            assertTrue(result.getJSONArray("events").getJSONObject(0).getBoolean("espnSyncFailed"))
        } finally { release.countDown(); enricher.close(); worker.shutdownNow() }
    }
    @Test fun broadcastsSharingAnEventFetchOnlyOnce() {
        val calls = AtomicInteger()
        val enricher = EventEnricher({ calls.incrementAndGet(); summary("21") })
        try {
            val data = JSONObject().put("events", JSONArray().put(row("21")).put(row("21").put("id", "other")))
            enricher.refresh(data)
            assertEquals(1, calls.get())
        } finally { enricher.close() }
    }
}
