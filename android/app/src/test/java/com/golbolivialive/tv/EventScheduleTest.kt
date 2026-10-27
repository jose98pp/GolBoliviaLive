package com.golbolivialive.tv

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.util.TimeZone

class EventScheduleTest {
    @Test fun todayUsesBoliviaDayAcrossUtcMidnight() {
        val now = EventSchedule.timestamp("2026-12-02T01:00:00Z")!!
        assertEquals("Hoy · 20:30", EventSchedule.label("2026-12-02T00:30Z", now))
        assertEquals("2/12 · 00:00", EventSchedule.label("2026-12-02T04:00:00Z", now))
        assertEquals("1/12 · 20:30", EventSchedule.label("2025-12-02T00:30:00Z", now))
    }

    @Test fun offsetsAndDeviceTimezoneDoNotChangeTheResult() {
        val previous = TimeZone.getDefault()
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("Asia/Tokyo"))
            val now = EventSchedule.timestamp("2026-12-02T00:30:00.123Z")!!
            assertEquals(now, EventSchedule.timestamp("2026-12-01T20:30:00.123-04:00"))
            assertEquals("Hoy · 20:30", EventSchedule.label("2026-12-01T20:30:00-04:00", now))
        } finally { TimeZone.setDefault(previous) }
    }

    @Test fun invalidOrMissingDatesNeverBecomeInventedSchedules() {
        listOf("", "null", "bad", "2026-12-01", "2026-12-01T20:30", "2026-02-30T20:30Z", "2026-12-01T25:00Z").forEach {
            assertNull(it, EventSchedule.timestamp(it))
            assertNull(it, EventSchedule.label(it))
        }
    }

    @Test fun catalogSortsStablyAndSnapshotKeepsTheOriginalTimestamp() {
        val rows = JSONObject("""{"events":[{"id":"none"},{"id":"later","scheduledAt":"2026-12-03T00:30Z"},{"id":"first","scheduledAt":"2026-12-02T00:30Z","customVideoUrl":"https://example.com/live.m3u8"},{"id":"same","scheduledAt":"2026-12-02T00:30Z"},{"id":"invalid","scheduledAt":"bad"}]}""")
        val items = Catalog.matches(rows)
        assertEquals(listOf("match:first", "match:same", "match:later", "match:none", "match:invalid"), items.map { it.id })
        val snapshot = PlaybackSnapshot(items.first(), 0, true)
        assertEquals(items.first().scheduledAt, PlaybackSnapshot.decode(snapshot.encode())?.item?.scheduledAt)
        assertEquals("none", rows.getJSONArray("events").getJSONObject(0).getString("id"))
    }
}
