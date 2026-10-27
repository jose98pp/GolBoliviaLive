package com.golbolivialive.tv

import java.text.ParsePosition
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

object EventSchedule {
    private val bolivia = TimeZone.getTimeZone("America/La_Paz")

    fun timestamp(value: String): Long? {
        val parts = Regex("^(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2})(?::(\\d{2})(?:\\.(\\d{1,3}))?)?(Z|[+-]\\d{2}:\\d{2})$").matchEntire(value) ?: return null
        val normalized = parts.groupValues[1] + ":" + parts.groupValues[2].ifBlank { "00" } + "." +
            parts.groupValues[3].padEnd(3, '0') + parts.groupValues[4]
        val position = ParsePosition(0)
        val parsed = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.ROOT).apply { isLenient = false }.parse(normalized, position)
        return parsed?.time?.takeIf { position.index == normalized.length }
    }

    fun label(value: String, now: Long = System.currentTimeMillis()): String? {
        val date = Date(timestamp(value) ?: return null)
        fun format(pattern: String, instant: Date) = SimpleDateFormat(pattern, Locale.ROOT).apply { timeZone = bolivia }.format(instant)
        val day = if (format("yyyy-MM-dd", date) == format("yyyy-MM-dd", Date(now))) "Hoy" else format("d/M", date)
        return "$day · ${format("HH:mm", date)}"
    }
}
