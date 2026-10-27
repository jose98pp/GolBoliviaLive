package com.golbolivialive.tv

import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder

data class PlaybackResolution(val item: WatchItem, val warning: String = "", val confirmed: Boolean = false)

object PlaybackResolver {
    fun apply(current: WatchItem, requested: WatchItem, resolution: PlaybackResolution): WatchItem {
        require(current.id == requested.id && resolution.item.id == current.id)
        if (current.sources != requested.sources || current.autoFailover != requested.autoFailover) return current
        return current.copy(sources = resolution.item.sources, autoFailover = resolution.item.autoFailover)
    }

    fun refresh(current: WatchItem, fetch: (String) -> JSONObject): PlaybackResolution = try {
        val id = current.id.substringAfter(':')
        val encoded = URLEncoder.encode(id, "UTF-8").replace("+", "%20")
        val response = fetch(if (current.channel) "/api/iptv/sports/$encoded" else "/api/live-events/$encoded")
        fromResponse(current, response)
    } catch (error: CatalogHttpException) {
        if (error.status == 404 && (!current.channel || error.code == "CHANNEL_NOT_FOUND"))
            PlaybackResolution(current.copy(sources = emptyList()), "El contenido ya no está publicado.", true)
        else PlaybackResolution(current, "No se pudo verificar la señal actual. Se usa el último catálogo disponible.")
    } catch (_: Exception) {
        PlaybackResolution(current, "No se pudo verificar la señal actual. Se usa el último catálogo disponible.")
    }

    fun fromResponse(current: WatchItem, response: JSONObject): PlaybackResolution {
        require(response.opt("success") != false)
        if (response.optBoolean("stale")) return PlaybackResolution(current, "El servidor conserva datos anteriores. Puedes actualizar el catálogo.")
        val fresh = if (current.channel) {
            Catalog.channels(JSONObject().put("channels", JSONArray().put(response.getJSONObject("channel")))).single()
        } else {
            Catalog.matches(JSONObject().put("events", JSONArray().put(response.getJSONObject("event")))).single()
        }
        require(current.id == fresh.id) { "Playback content mismatch" }
        // Refresh playback independently: a raw API response must not roll back ESPN scores or logos.
        return PlaybackResolution(current.copy(sources = fresh.sources, autoFailover = fresh.autoFailover), confirmed = true)
    }
}
