package com.golbolivialive.tv

object EmbedDocument {
    val origin = "https://${BuildConfig.APPLICATION_ID}/"

    fun iframe(source: WatchSource, autoplay: Boolean): String {
        require(source.embedded && Catalog.https(source.url) != null)
        val url = if (source.provider == "Kick") source.url + "?autoplay=$autoplay&muted=false" else source.url
        fun attribute(value: String) = value.replace("&", "&amp;").replace("\"", "&quot;")
            .replace("<", "&lt;").replace(">", "&gt;").replace("'", "&#39;")
        return """<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="referrer" content="strict-origin-when-cross-origin"/><style>html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}iframe{display:block;border:0;width:100%;height:100%}</style></head><body><iframe id="provider-player" title="${attribute(source.provider)}" src="${attribute(url)}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen="allowfullscreen" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"></iframe></body></html>"""
    }
}
