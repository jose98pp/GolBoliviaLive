package com.golbolivialive.tv

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class CatalogStateTest {
    private fun snapshot(vararg ids: String) = JSONObject().put("events", JSONArray(ids.map { JSONObject().put("id", it).put("version", 1) }))
    private fun ids(state: CatalogState): List<String> = state.events.getJSONArray("events").let { rows -> (0 until rows.length()).map { rows.getJSONObject(it).getString("id") } }

    @Test fun emptyUnconfirmedResponseNeverErasesVisibleEvents() {
        val state = CatalogState(); state.accept(snapshot("a", "b"))
        repeat(3) { assertFalse(state.accept(snapshot())); assertEquals(listOf("a", "b"), ids(state)) }
    }
    @Test fun temporaryPartialSnapshotKeepsOldEventsAndAddsNewOnes() {
        val state = CatalogState(); state.accept(snapshot("a", "b"))
        state.accept(snapshot("a", "c"))
        assertEquals(setOf("a", "b", "c"), ids(state).toSet())
        state.accept(snapshot("a", "b", "c"))
        assertEquals(setOf("a", "b", "c"), ids(state).toSet())
    }
    @Test fun authoritativeEmptySnapshotAllowsRealDeletion() {
        val state = CatalogState(); state.accept(snapshot("a"))
        assertTrue(state.accept(snapshot().put("catalogConfirmed", true)))
        assertTrue(ids(state).isEmpty())
    }
    @Test fun repeatedLegacySnapshotAllowsConfirmedRemovalButStaleSnapshotCannot() {
        val state = CatalogState(); state.accept(snapshot("a", "b"))
        repeat(3) { state.accept(snapshot("a").put("stale", true)); assertTrue("b" in ids(state)) }
        state.accept(snapshot("a")); assertTrue("b" in ids(state))
        state.accept(snapshot("a")); assertEquals(listOf("a"), ids(state))
    }
    @Test fun oldEnrichmentCannotResurrectRemovedEvent() {
        val state = CatalogState(); state.accept(snapshot("a", "b"))
        val old = state.events; val revision = state.revision
        state.accept(snapshot("a").put("catalogConfirmed", true))
        assertFalse(state.enrich(old, revision)); assertEquals(listOf("a"), ids(state))
    }
    @Test fun equalServerVersionPreservesEspnResultAndOlderVersionCannotRegressIt() {
        val state = CatalogState(); state.accept(snapshot("a"))
        val updated = JSONObject(state.events.toString())
        updated.getJSONArray("events").getJSONObject(0).put("isLive", true).put("homeScore", 2)
        state.enrich(updated, state.revision)
        state.accept(snapshot("a"))
        assertEquals(2, state.events.getJSONArray("events").getJSONObject(0).getInt("homeScore"))
        val newer = snapshot("a"); newer.getJSONArray("events").getJSONObject(0).put("version", 2).put("homeScore", 3)
        state.accept(newer); state.accept(snapshot("a"))
        assertEquals(3, state.events.getJSONArray("events").getJSONObject(0).getInt("homeScore"))
    }
    @Test fun corruptSnapshotCannotPartiallyReplaceGoodCatalog() {
        val state = CatalogState(); state.accept(snapshot("a"))
        val broken = snapshot("b"); broken.getJSONArray("events").put(JSONObject())
        assertTrue(runCatching { state.accept(broken) }.isFailure)
        assertEquals(listOf("a"), ids(state))
    }
    @Test fun savedJsonRestoresWithoutNetworkAndKeepsArtwork() {
        val state = CatalogState(); val data = snapshot("a")
        data.getJSONArray("events").getJSONObject(0).put("espnHomeLogo", "https://images.test/a.png")
        state.accept(data)
        val disk = state.events.toString(); val restored = CatalogState()
        restored.accept(JSONObject(disk).put("catalogConfirmed", true))
        assertEquals(listOf("a"), ids(restored))
        assertEquals("https://images.test/a.png", restored.events.getJSONArray("events").getJSONObject(0).getString("espnHomeLogo"))
    }
    @Test fun newlyCreatedEventsAppearOnFirstResponseEvenDuringPartialSnapshot() {
        val state = CatalogState(); state.accept(snapshot("existing", "other"))
        state.accept(snapshot("existing", "new"))
        assertTrue("new" in ids(state))
        assertTrue("other" in ids(state))
    }
}
