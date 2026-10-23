package com.golbolivialive.tv

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class EspnSyncTest {
    private fun events(id: String = "991", enabled: Boolean = true) = JSONObject("""{"events":[{"id":"local","homeTeam":"h","awayTeam":"a","isLive":false,"broadcastMode":"pre_match","espnLink":{"enabled":$enabled,"eventId":"$id","league":"bol.1"},"primaryProvider":"cloudflare","customVideoUrl":"https://example.com/live.m3u8"}]}""")
    private fun summary(id: String = "991", state: String = "in", name: String = "STATUS_IN_PROGRESS", completed: Boolean = false) = JSONObject("""{"header":{"id":"$id","competitions":[{"status":{"type":{"state":"$state","name":"$name","completed":$completed},"period":2,"displayClock":"75' + 2'"},"competitors":[{"homeAway":"away","score":{"displayValue":"1"}},{"homeAway":"home","score":"2"}]}]}}""")

    @Test fun espnOverridesScheduledAdminStateWithoutChangingTheStream() {
        val original = events()
        val enriched = EspnSync.refresh(original) { path ->
            assertEquals("/api/football-api/match/991?league=bol.1", path)
            summary()
        }
        val item = Catalog.matches(enriched).single()
        assertEquals("live", item.category)
        assertEquals("2 – 1", item.score)
        assertTrue(item.status.contains("75' + 2'"))
        assertEquals(listOf("https://example.com/live.m3u8"), item.streams)
        assertFalse(original.getJSONArray("events").getJSONObject(0).optBoolean("isLive"))
    }

    @Test fun handlesFinalHalftimeAndPreMatchFromEspn() {
        val cases = listOf(Triple("post", "STATUS_FULL_TIME", "finished"), Triple("in", "STATUS_HALFTIME", "live"), Triple("pre", "STATUS_SCHEDULED", "today"))
        cases.forEach { (state, name, category) ->
            val item = Catalog.matches(EspnSync.refresh(events()) { summary(state = state, name = name) }).single()
            assertEquals(category, item.category)
            when (state) {
                "post" -> assertEquals("FINALIZADO", item.status)
                "pre" -> assertEquals("VS", item.score)
                else -> assertEquals("ENTRETIEMPO", item.status)
            }
        }
    }

    @Test fun completedFlagWinsAndWrongEventCannotOverwriteMatch() {
        assertEquals("Finalizado", EspnSync.parse(summary(completed = true), "991")?.getString("period"))
        assertNull(EspnSync.parse(summary(id = "992"), "991"))
    }

    @Test fun disabledOrInvalidLinksNeverQueryEspn() {
        EspnSync.refresh(events(enabled = false)) { error("Must not fetch") }
        EspnSync.refresh(events(id = "bad/id")) { error("Must not fetch") }
        assertEquals("today", Catalog.matches(EspnSync.refresh(events(enabled = false)) { error("Must not fetch") }).single().category)
    }

    @Test fun transientFailureRetainsLastResultAndLabelsItStale() {
        EspnSync.refresh(events(id = "551")) { summary(id = "551", state = "post") }
        val item = Catalog.matches(EspnSync.refresh(events(id = "551")) { throw java.io.IOException("offline") }).single()
        assertEquals("finished", item.category)
        assertTrue(item.status.contains("ESPN sin actualizar"))
        val other = Catalog.matches(EspnSync.refresh(events(id = "552")) { throw java.io.IOException("offline") }).single()
        assertFalse(other.status.contains("FINALIZADO"))
        assertEquals("VS", other.score)
    }

    @Test fun twoLocalBroadcastsLinkedToSameEspnEventShareOneRequest() {
        val data = events(); data.getJSONArray("events").put(JSONObject(data.getJSONArray("events").getJSONObject(0).toString()).put("id", "other"))
        var calls = 0
        val enriched = EspnSync.refresh(data) { calls++; summary() }
        assertEquals(1, calls)
        assertTrue(Catalog.matches(enriched).all { it.live })
    }
}
