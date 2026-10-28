package com.golbolivialive.tv

import java.net.URI

object PlaybackPolicy {
    fun mimeType(source: WatchSource): String? {
        if (source.embedded) return null
        val path = runCatching { URI(source.url).path.orEmpty().lowercase() }.getOrDefault("")
        return when {
            source.provider == "DASH" || path.endsWith(".mpd") -> "application/dash+xml"
            path.endsWith(".mp4") || path.endsWith(".m4v") -> "video/mp4"
            path.endsWith(".webm") -> "video/webm"
            path.endsWith(".mp3") -> "audio/mpeg"
            path.endsWith(".aac") -> "audio/aac"
            else -> "application/x-mpegURL"
        }
    }

    fun canFailover(enabled: Boolean, status: Int?, restricted: Boolean = false): Boolean =
        enabled && status !in listOf(401, 403) && !restricted

    fun sourceIndex(sources: List<WatchSource>, previous: WatchSource?): Int = sources.indexOfFirst {
        if (!previous?.id.isNullOrBlank()) it.id == previous?.id else it.url == previous?.url && it.embedded == previous?.embedded
    }.coerceAtLeast(0)

    fun errorMessage(status: Int?, stage: String, errorName: String): String = when (status) {
        401 -> "HTTP 401: la señal requiere una autorización vigente. Reintenta para consultar su dirección actual."
        403 -> "HTTP 403: el proveedor denegó el acceso. Cambiar el búfer no corrige este permiso."
        404 -> "HTTP 404 en $stage: el recurso no está disponible."
        null -> "Fallo en $stage ($errorName). Consulta Diagnóstico o pulsa Reintentar."
        else -> "HTTP $status en $stage. Puedes reintentar o elegir otra señal."
    }
}
