package com.golbolivialive.tv

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class SportsEventsTest {
    private fun saved(sport: String = "mma", id: String = "200", state: String = "live") = JSONObject("""{
        "sport":"$sport","competition":"${if (sport == "mma") "UFC 320" else "NBA"}","competitionLogo":"https://images.test/competition.png",
        "state":"$state","phase":"${if (sport == "mma") "Round 2" else "3º cuarto"}","clock":"03:15",
        "participants":[{"name":"A","imageUrl":"https://images.test/a.png","score":142},{"name":"B","imageUrl":"https://images.test/b.png","score":135}],
        "source":{"enabled":true,"competition":"${if (sport == "mma") "ufc" else "nba"}","eventId":"$id","boutId":"201","date":"2026-10-24"}}""")
    private fun catalog(data: JSONObject) = JSONObject().put("events", JSONArray().put(JSONObject()
        .put("id", "local").put("sports", data).put("homeTeam", "bolivar").put("awayTeam", "oriente")
        .put("isLive", false).put("broadcastMode", "pre_match").put("homeScore", 0).put("awayScore", 0)
        .put("primaryProvider", "cloudflare").put("customVideoUrl", "https://video.test/live.m3u8")))
    private fun fightRaw(id: String = "200") = JSONObject("""{"leagues":[{"logos":[{"href":"https://images.test/ufc.png"}]}],"events":[{"id":"$id","competitions":[
        {"id":"201","status":{"type":{"state":"post","name":"STATUS_FINAL","completed":true,"detail":"KO/TKO"},"period":2,"displayClock":"02:40"},"competitors":[{"athlete":{"displayName":"A","headshot":{"href":"https://images.test/new-a.png"}},"winner":true},{"athlete":{"displayName":"B"},"winner":false}]},
        {"id":"202","status":{"type":{"state":"in"}},"competitors":[{"athlete":{"displayName":"Other A"}},{"athlete":{"displayName":"Other B"}}]}]}]}""")
    private fun basketballRaw() = JSONObject("""{"header":{"id":"300","league":{"logos":[{"href":"https://images.test/nba.png"}]},"competitions":[{"id":"201","status":{"type":{"state":"in","name":"STATUS_IN_PROGRESS"},"period":5,"displayClock":"01:12"},"competitors":[{"homeAway":"away","team":{"displayName":"Boston","logo":"https://images.test/boston.png"},"score":{"displayValue":"135"}},{"homeAway":"home","team":{"displayName":"Los Angeles","logos":[{"href":"https://images.test/la.png"}]},"score":"142"}]}]}}""")

    @Test fun sportsCatalogUsesParticipantPhotosAndCompetitionInsteadOfFootballClubs() {
        val item = Catalog.matches(catalog(saved())).single()
        assertEquals("mma", item.sport)
        assertEquals("A", item.home!!.name)
        assertEquals("https://images.test/a.png", item.home!!.crest)
        assertEquals("https://images.test/competition.png", item.competitionLogo)
        assertEquals("UFC 320", item.competition)
        assertEquals("VS", item.score)
        assertEquals("live", item.category)
        assertTrue(item.status.contains("Round 2"))
        assertFalse(item.status.contains("1T"))
        assertEquals("https://video.test/live.m3u8", item.streams.single())
    }

    @Test fun basketballPreservesLargeScoresAndDoesNotInventMissingPoints() {
        val sports = saved("basketball")
        assertEquals("142 – 135", Catalog.matches(catalog(sports)).single().score)
        sports.getJSONArray("participants").getJSONObject(1).remove("score")
        assertEquals("142 – —", Catalog.matches(catalog(sports)).single().score)
        assertEquals("VS", Catalog.matches(catalog(sports.put("state", "pre"))).single().score)
    }

    @Test fun coversBreakFinalPostponedCancelledAndManualOtherEvents() {
        mapOf("pre" to "today", "live" to "live", "break" to "live", "final" to "finished", "postponed" to "today", "cancelled" to "finished").forEach { (state, category) ->
            assertEquals(category, Catalog.matches(catalog(saved(state = state))).single().category)
        }
        val manual = saved().put("sport", "other").put("source", JSONObject.NULL)
        SportsEvents.refresh(catalog(manual)) { error("Manual events must not query ESPN") }
        TeamCatalog.load(catalog(manual)) { error("Sports participants must not query football clubs") }
        EspnSync.refresh(catalog(manual)) { error("Sports must not query football summary") }
    }

    @Test fun selectsExactFightAndShowsOnlyExplicitWinnerAndDecision() {
        val sports = saved()
        val parsed = SportsEvents.parse(fightRaw(), sports)!!
        assertEquals("KO/TKO", parsed.getString("result"))
        assertEquals("Round 2", parsed.getString("phase"))
        assertFalse(parsed.getJSONArray("participants").getJSONObject(0).has("score"))
        val item = Catalog.matches(SportsEvents.refresh(catalog(sports)) { fightRaw() }).single()
        assertEquals("A", item.winner)
        assertEquals("KO/TKO", item.result)
        assertEquals("VS", item.score)
        assertEquals("finished", item.category)
        assertEquals("https://images.test/a.png", item.home!!.crest)
    }

    @Test fun wrongFightMissingFightAndWrongEventCannotSubstituteAnotherBout() {
        val sports = saved()
        assertNull(SportsEvents.parse(fightRaw("999"), sports))
        sports.getJSONObject("source").put("boutId", "999")
        assertNull(SportsEvents.parse(fightRaw(), sports))
        sports.getJSONObject("source").remove("boutId")
        assertNull(SportsEvents.parse(fightRaw(), sports))
    }

    @Test fun validatesSourceAndUsesDatedBackendRouteForExactFight() {
        SportsEvents.refresh(catalog(saved(id = "601"))) { path ->
            assertEquals("/api/sports-api/event?competition=ufc&eventId=601&boutId=201&date=2026-10-24", path)
            fightRaw("601")
        }
        for ((field, value) in listOf("eventId" to "../private", "competition" to "nba", "date" to "2026-02-30")) {
            val sports = saved(); sports.getJSONObject("source").put(field, value)
            SportsEvents.refresh(catalog(sports)) { error("Invalid source must not fetch") }
        }
        val disabled = saved(); disabled.getJSONObject("source").put("enabled", false)
        SportsEvents.refresh(catalog(disabled)) { error("Disabled source must not fetch") }
    }

    @Test fun basketballOrdersHomeAwayAndParsesOvertimeAndLeagueArt() {
        val parsed = SportsEvents.parse(basketballRaw(), saved("basketball", "300"))!!
        assertEquals("Prórroga", parsed.getString("phase"))
        assertEquals("01:12", parsed.getString("clock"))
        assertEquals("https://images.test/nba.png", parsed.getString("competitionLogo"))
        val participants = parsed.getJSONArray("participants")
        assertEquals("Los Angeles", participants.getJSONObject(0).getString("name"))
        assertEquals(142, participants.getJSONObject(0).getInt("score"))
        assertEquals("https://images.test/la.png", participants.getJSONObject(0).getString("imageUrl"))
        assertEquals(135, participants.getJSONObject(1).getInt("score"))
    }

    @Test fun failedRefreshAndPreviewPreserveLastValidFightWithoutChangingStream() {
        val sports = saved(id = "602")
        val original = catalog(sports)
        SportsEvents.refresh(original) { fightRaw("602") }
        val preview = Catalog.matches(SportsEvents.preview(original)).single()
        assertEquals("finished", preview.category)
        val stale = Catalog.matches(SportsEvents.refresh(original) { throw java.io.IOException("offline") }).single()
        assertEquals("KO/TKO", stale.result)
        assertEquals("A", stale.winner)
        assertTrue(stale.status.contains("ESPN sin actualizar"))
        assertEquals("https://video.test/live.m3u8", stale.streams.single())
        assertEquals("live", sports.getString("state"))
        val fresh = Catalog.matches(SportsEvents.preview(catalog(saved(id = "603")))).single()
        assertFalse(fresh.status.contains("FINALIZADO"))
    }

    @Test fun repeatedBroadcastsShareQueryButKeepTheirOwnSavedArtwork() {
        val raw = catalog(saved(id = "604"))
        val another = JSONObject(raw.getJSONArray("events").getJSONObject(0).toString()).put("id", "second")
        another.getJSONObject("sports").put("competitionLogo", "https://images.test/custom.png")
        raw.getJSONArray("events").put(another)
        var calls = 0
        val items = Catalog.matches(SportsEvents.refresh(raw) { calls++; fightRaw("604") })
        assertEquals(1, calls)
        assertEquals("https://images.test/custom.png", items[1].competitionLogo)
    }

    @Test fun unsafeImagesFallBackAndNewIdentityNeverInheritsWrongPortrait() {
        val sports = saved(id = "605")
        sports.put("competitionLogo", "javascript:alert(1)")
        sports.getJSONArray("participants").getJSONObject(0).put("imageUrl", "http://images.test/a.png")
        val item = Catalog.matches(catalog(sports)).single()
        assertEquals("", item.competitionLogo)
        assertEquals("", item.home!!.crest)
        val updated = Catalog.matches(SportsEvents.refresh(catalog(sports)) { fightRaw("605") }).single()
        assertEquals("https://images.test/new-a.png", updated.home!!.crest)
        val raw = fightRaw("605")
        raw.getJSONArray("events").getJSONObject(0).getJSONArray("competitions").getJSONObject(0).getJSONArray("competitors").getJSONObject(0)
            .getJSONObject("athlete").put("displayName", "Different person").put("headshot", JSONObject.NULL)
        val changed = Catalog.matches(SportsEvents.refresh(catalog(saved(id = "605"))) { raw }).single()
        assertEquals("Different person", changed.home!!.name)
        assertEquals("", changed.home!!.crest)
    }

    @Test fun restoresSportsImagesAndResultAfterActivityRecreation() {
        val item = Catalog.matches(catalog(saved(state = "final").put("result", "Decisión unánime"))).single()
        val snapshot = PlaybackSnapshot(item, 0, false)
        assertEquals(snapshot, PlaybackSnapshot.decode(snapshot.encode()))
    }

    @Test fun malformedSportsDoNotBecomeFakeFootballMatches() {
        val data = saved(); data.put("participants", JSONArray())
        assertTrue(Catalog.matches(catalog(data)).isEmpty())
    }
}
