package com.golbolivialive.tv

import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.res.Configuration
import android.os.Build
import android.view.WindowInsets
import android.view.WindowInsetsController
import androidx.media3.ui.AspectRatioFrameLayout
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.MotionEvent
import org.json.JSONObject
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.*
import androidx.media3.common.MediaItem
import androidx.media3.common.AudioAttributes
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.HttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import java.util.concurrent.Executors

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class MainActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private val executor = Executors.newFixedThreadPool(4)
    private val preferences by lazy { getSharedPreferences("viewer", MODE_PRIVATE) }
    private val backgroundColor = Color.rgb(8, 13, 22)
    private val green = Color.rgb(54, 220, 150)
    private val crestImages = CrestImages()
    private var embedded: EmbeddedPlayer? = null
    private var videoHost: FrameLayout? = null
    private var watchHeader: TextView? = null
    private var watchChrome: FrameLayout? = null
    private var watchMenu: Button? = null
    private var chromeVisible = true
    private val hideChrome = object : Runnable {
        override fun run() {
            if (selected == null || !active) return
            showWatchChrome(false)
        }
    }
    private lateinit var root: LinearLayout
    private lateinit var body: LinearLayout
    private var matches = emptyList<WatchItem>()
    private var channels = emptyList<WatchItem>()
    private var section = "Inicio"
    private var query = ""
    private var page = 0
    private var loading = false
    private var notice = "Conectando con GolBoliviaLive…"
    private var selected: WatchItem? = null
    private var sourceIndex = 0
    private var player: ExoPlayer? = null
    private var playerView: PlayerView? = null
    private var playerStatus: TextView? = null
    private var resumePlayback = true
    private var returnFocus: String? = null
    private var active = false
    private var matchesLoading = false
    private var channelsLoading = false
    private var channelsLoadedAt = 0L
    private var latestEvents = JSONObject("{\"events\":[]}")
    private var latestTeams = emptyMap<String, TeamInfo>()
    private var matchNotice = ""
    private var channelNotice = ""
    private val refresh = object : Runnable {
        override fun run() {
            loadCatalog()
            handler.postDelayed(this, 30000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        section = savedInstanceState?.getString("section") ?: "Inicio"
        query = savedInstanceState?.getString("query").orEmpty()
        window.decorView.setOnApplyWindowInsetsListener { view, insets ->
            if (selected != null) view.setPadding(0, 0, 0, 0)
            else view.setPadding(insets.systemWindowInsetLeft, insets.systemWindowInsetTop,
                insets.systemWindowInsetRight, insets.systemWindowInsetBottom)
            insets
        }
        render()
        PlaybackSnapshot.decode(savedInstanceState?.getString("playback"))?.let { open(it.item, it) }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString("section", section)
        outState.putString("query", query)
        selected?.let { outState.putString("playback", PlaybackSnapshot(it, sourceIndex, player?.playWhenReady ?: resumePlayback).encode()) }
        super.onSaveInstanceState(outState)
    }

    override fun onStart() {
        super.onStart()
        active = true
        if (selected != null) startPlayer()
        loadCatalog()
        handler.postDelayed(refresh, 30000)
        if (selected != null) { applyImmersive(); handler.postDelayed(hideChrome, 5000) }
    }

    override fun onStop() {
        active = false
        handler.removeCallbacks(refresh)
        handler.removeCallbacks(hideChrome)
        resumePlayback = player?.playWhenReady ?: resumePlayback
        releasePlayer()
        super.onStop()
    }

    override fun onDestroy() {
        crestImages.close()
        executor.shutdownNow()
        handler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        if (selected == null) render(currentFocus?.tag as? String)
        else {
            applyImmersive()
            videoHost?.requestLayout()
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus && selected != null) applyImmersive()
    }

    private fun applyImmersive() {
        val watching = selected != null
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(!watching)
            window.insetsController?.apply {
                if (watching) {
                    systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    hide(WindowInsets.Type.systemBars())
                } else show(WindowInsets.Type.systemBars())
            }
        } else {
            window.decorView.systemUiVisibility = if (watching) View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_STABLE else View.SYSTEM_UI_FLAG_VISIBLE
        }
        if (watching) window.decorView.setPadding(0, 0, 0, 0)
        window.decorView.requestApplyInsets()
    }

    private fun showWatchChrome(show: Boolean) {
        chromeVisible = show
        watchChrome?.visibility = if (show) View.VISIBLE else View.GONE
        watchMenu?.visibility = if (show) View.VISIBLE else View.GONE
        handler.removeCallbacks(hideChrome)
        if (show) handler.postDelayed(hideChrome, 5000)
        else { embedded?.focusVideo(); playerView?.requestFocus() }
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun largeText() = preferences.getBoolean("largeText", false)
    private fun label(value: String, size: Float, muted: Boolean = false) = TextView(this).apply {
        text = value
        textSize = size * if (largeText()) 1.15f else 1f
        setTextColor(if (muted) Color.rgb(164, 177, 196) else Color.WHITE)
        setPadding(dp(4), dp(5), dp(4), dp(5))
    }

    private fun surface(focused: Boolean = false, featured: Boolean = false) = GradientDrawable(
        GradientDrawable.Orientation.TL_BR,
        if (featured) intArrayOf(Color.rgb(21, 65, 62), Color.rgb(17, 29, 46))
        else intArrayOf(Color.rgb(28, 39, 58), Color.rgb(17, 25, 40))
    ).apply {
        cornerRadius = dp(16).toFloat()
        setStroke(dp(if (focused) 3 else 1), if (focused) green else Color.rgb(47, 61, 80))
    }

    private fun focusable(view: View, tag: String) {
        view.tag = tag
        view.isFocusable = true
        view.isClickable = true
        view.background = surface()
        view.setOnFocusChangeListener { target, focused ->
            target.background = surface(focused)
            target.elevation = dp(if (focused) 8 else 0).toFloat()
            if (focused) target.parent?.requestChildFocus(target, target)
        }
    }

    private fun button(title: String, tag: String = title, action: () -> Unit) = Button(this).apply {
        text = title
        isAllCaps = false
        textSize = if (largeText()) 18f else 15f
        setTextColor(Color.WHITE)
        setPadding(dp(18), dp(8), dp(18), dp(8))
        minimumHeight = dp(52)
        focusable(this, tag)
        setOnClickListener { action() }
        layoutParams = LinearLayout.LayoutParams(-2, -2).apply { setMargins(dp(4), dp(4), dp(4), dp(4)) }
    }

    private fun favorites() = preferences.getStringSet("favorites", emptySet()).orEmpty()
    private fun toggleFavorite(item: WatchItem) {
        val updated = favorites().toMutableSet()
        if (!updated.add(item.id)) updated.remove(item.id)
        preferences.edit().putStringSet("favorites", updated).apply()
        Toast.makeText(this, if (item.id in updated) "Guardado en favoritos" else "Quitado de favoritos", Toast.LENGTH_SHORT).show()
    }

    private fun render(focusTag: String? = null) {
        if (selected != null || isDestroyed) return
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(backgroundColor)
            setPadding(dp(24), dp(12), dp(24), dp(12))
        }
        setContentView(root)
        val header = LinearLayout(this).apply { gravity = Gravity.CENTER_VERTICAL }
        header.addView(label("GOLBOLIVIA  LIVE", 21f).apply {
            setTextColor(green); setTypeface(typeface, Typeface.BOLD)
        }, LinearLayout.LayoutParams(0, -2, 1f))
        header.addView(button("Buscar") { search() })
        root.addView(header)
        val nav = LinearLayout(this)
        listOf("Inicio", "Partidos", "Canales", "Favoritos", "Ajustes").forEach { tab ->
            nav.addView(button(if (section == tab) "• $tab" else tab, "nav:$tab") {
                section = tab; page = 0; render("nav:$tab")
            })
        }
        root.addView(HorizontalScrollView(this).apply {
            isHorizontalScrollBarEnabled = false; addView(nav)
        })
        body = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(4), dp(12), dp(4), dp(32)) }
        root.addView(ScrollView(this).apply { isFillViewport = true; addView(body) }, LinearLayout.LayoutParams(-1, 0, 1f))
        if (section == "Ajustes") settings() else {
            if (notice.isNotBlank()) body.addView(label(notice, 14f, true))
            if (query.isNotBlank()) {
                body.addView(label("Resultados para «$query»", 22f))
                body.addView(button("Quitar búsqueda") { query = ""; page = 0; render() })
            }
            fun filtered(items: List<WatchItem>) = items.filter {
                query.isBlank() || (it.title + " " + it.subtitle).contains(query, ignoreCase = true)
            }
            when (section) {
                "Inicio" -> {
                    val live = filtered(matches).filter { it.live }
                    (live.firstOrNull() ?: filtered(matches).firstOrNull())?.let { featured -> hero(featured) }
                    row("En vivo", live)
                    row("Próximos partidos", filtered(matches).filter { it.category == "today" })
                    row("Resultados", filtered(matches).filter { it.category == "finished" })
                    row("Tus favoritos", filtered(matches + channels).filter { it.id in favorites() })
                    row("Explorar canales", filtered(channels).take(24))
                }
                "Partidos" -> grid("Partidos", filtered(matches))
                "Canales" -> grid("Canales", filtered(channels))
                "Favoritos" -> grid("Tus favoritos", filtered(matches + channels).filter { it.id in favorites() })
            }
            body.addView(button(if (loading) "Actualizando…" else "Actualizar catálogo") { loadCatalog(true) })
        }
        val target = focusTag?.let { root.findViewWithTag<View>(it) }
            ?: root.findViewWithTag("nav:$section")
        target?.post { target.requestFocus() }
    }

    private fun shield(team: TeamInfo, size: Int): View = FrameLayout(this).apply {
        layoutParams = LinearLayout.LayoutParams(dp(size), dp(size))
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        addView(label(team.name.split(' ').filter { it.isNotBlank() }.take(2).joinToString("") { it.take(1) }.uppercase(), size / 3f).apply {
            gravity = Gravity.CENTER; setTypeface(typeface, Typeface.BOLD)
        }, FrameLayout.LayoutParams(-1, -1))
        val image = ImageView(this@MainActivity).apply { scaleType = ImageView.ScaleType.FIT_CENTER; contentDescription = null }
        addView(image, FrameLayout.LayoutParams(-1, -1).apply { setMargins(dp(4), dp(4), dp(4), dp(4)) })
        if (team.crest.isNotBlank()) crestImages.load(team.crest, image)
    }

    private fun matchup(item: WatchItem, large: Boolean): LinearLayout = LinearLayout(this).apply {
        gravity = Gravity.CENTER
        val size = if (large) 90 else 58
        item.home?.let { addView(shield(it, size)) }
        addView(label(item.score, if (large) 35f else 25f).apply {
            gravity = Gravity.CENTER; setTypeface(typeface, Typeface.BOLD)
        }, LinearLayout.LayoutParams(0, -2, 1f))
        item.away?.let { addView(shield(it, size)) }
    }

    private fun matchSurface(view: View, item: WatchItem, featured: Boolean = false) {
        view.background = MatchArt(item.home?.color ?: "#193D57", item.away?.color ?: "#122438", featured)
        view.setOnFocusChangeListener { target, focused ->
            target.foreground = if (focused) GradientDrawable().apply {
                setColor(Color.TRANSPARENT); cornerRadius = dp(16).toFloat(); setStroke(dp(3), green)
            } else null
            target.elevation = dp(if (focused) 8 else 0).toFloat()
        }
    }

    private fun hero(item: WatchItem) {
        val hero = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(24), dp(20), dp(24), dp(20))
            layoutParams = LinearLayout.LayoutParams(-1, -2).apply { setMargins(0, dp(4), 0, dp(24)) }
            background = MatchArt(item.home?.color ?: "#163A51", item.away?.color ?: "#14283E", true)
        }
        hero.addView(label("PARTIDO DESTACADO  ·  ${item.status}", 14f).apply { setTypeface(typeface, Typeface.BOLD) })
        hero.addView(label(item.title, 32f).apply { setTypeface(typeface, Typeface.BOLD); maxLines = 2 })
        hero.addView(matchup(item, true), LinearLayout.LayoutParams(-1, dp(96)))
        hero.addView(label("${item.home?.name.orEmpty()}   /   ${item.away?.name.orEmpty()}", 18f).apply { gravity = Gravity.CENTER })
        hero.addView(label(item.subtitle, 15f))
        hero.addView(button(if (item.sources.isEmpty()) "Ver detalle" else "▶ Ver partido", "hero:${item.id}") { open(item) })
        body.addView(hero)
    }

    private fun card(item: WatchItem, width: Int): View = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(16), dp(12), dp(16), dp(12))
        layoutParams = LinearLayout.LayoutParams(dp(width), dp(if (largeText()) 244 else 220)).apply {
            setMargins(dp(5), dp(8), dp(10), dp(8))
        }
        focusable(this, item.id)
        matchSurface(this, item)
        contentDescription = "${item.title}. ${item.home?.name.orEmpty()} ${item.away?.name.orEmpty()}. ${item.status}. ${item.score}. ${item.subtitle}. Pulsa OK para abrir. Mantén OK para favoritos."
        addView(label(item.status, 12f).apply {
            setTypeface(typeface, Typeface.BOLD)
            background = GradientDrawable().apply { setColor(Color.argb(190, 4, 10, 18)); cornerRadius = dp(6).toFloat() }
        })
        if (!item.channel) addView(matchup(item, false), LinearLayout.LayoutParams(-1, dp(70)))
        else if (item.logo.isNotBlank()) addView(shield(TeamInfo(item.id, item.title, item.logo), 62))
        addView(label(if (item.channel) item.title else "${item.home?.name.orEmpty()} vs ${item.away?.name.orEmpty()}", 18f).apply {
            maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END
            setTypeface(typeface, Typeface.BOLD)
        }, LinearLayout.LayoutParams(-1, 0, 1f))
        addView(label((if (item.id in favorites()) "★ " else "") + item.subtitle, 12f).apply {
            maxLines = 2; ellipsize = android.text.TextUtils.TruncateAt.END
        })
        setOnClickListener { open(item) }
        setOnLongClickListener { toggleFavorite(item); render(item.id); true }
    }

    private fun row(title: String, items: List<WatchItem>) {
        body.addView(label(title, 23f))
        if (items.isEmpty()) { body.addView(label("Sin contenido disponible en esta sección.", 15f, true)); return }
        val rail = LinearLayout(this)
        items.forEach { rail.addView(card(it, 260)) }
        body.addView(HorizontalScrollView(this).apply { isHorizontalScrollBarEnabled = false; addView(rail) })
    }

    private fun grid(title: String, items: List<WatchItem>) {
        body.addView(label("$title · ${items.size}", 26f))
        if (items.isEmpty()) body.addView(label("Sin resultados. Puedes buscar otro nombre o actualizar.", 16f, true))
        val width = resources.configuration.screenWidthDp - 70
        val columns = if (width >= 820) 3 else if (width >= 480) 2 else 1
        val slice = items.drop(page * 24).take(24)
        slice.chunked(columns).forEach { group ->
            body.addView(LinearLayout(this).apply { group.forEach { addView(card(it, width / columns - 16)) } })
        }
        val pagination = LinearLayout(this)
        if (page > 0) pagination.addView(button("Anterior") { page--; render() })
        if ((page + 1) * 24 < items.size) pagination.addView(button("Siguiente") { page++; render() })
        body.addView(pagination)
    }

    private fun search() {
        val input = EditText(this).apply { setText(query); hint = "Nombre de partido, canal o país"; setSingleLine() }
        AlertDialog.Builder(this).setTitle("Buscar").setView(input)
            .setPositiveButton("Buscar") { _, _ -> query = input.text.toString().trim(); page = 0; render() }
            .setNegativeButton("Cancelar", null).show()
    }

    private fun settings() {
        body.addView(label("A tu manera", 32f))
        body.addView(label("Flechas: navegar · OK: abrir · Atrás: volver\nMantén OK sobre una tarjeta para guardarla en favoritos.\nDurante el video: OK muestra los controles; Play/Pausa controla la reproducción.", 17f, true))
        fun toggle(key: String, title: String, default: Boolean) {
            body.addView(button("$title: ${if (preferences.getBoolean(key, default)) "Activado" else "Desactivado"}", key) {
                preferences.edit().putBoolean(key, !preferences.getBoolean(key, default)).apply(); render(key)
            })
        }
        toggle("autoplay", "Reproducir al abrir", true)
        toggle("channelKeys", "CH+ / CH− cambia de canal", true)
        toggle("largeText", "Texto grande", false)
        body.addView(button("Configurar mando Bluetooth") {
            try { startActivity(Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS)) }
            catch (_: ActivityNotFoundException) {
                Toast.makeText(this, "Abre Ajustes de Android → Mandos y accesorios para emparejar tu mando.", Toast.LENGTH_LONG).show()
            }
        })
        body.addView(button("Calidad: ${preferences.getString("quality", "Automática")}", "quality") {
            val labels = arrayOf("Automática", "Ahorro de datos · hasta 480p", "HD · hasta 720p", "Full HD · hasta 1080p")
            AlertDialog.Builder(this).setTitle("Calidad máxima").setItems(labels) { _, which ->
                preferences.edit().putString("quality", labels[which]).putInt("maxHeight", intArrayOf(Int.MAX_VALUE, 480, 720, 1080)[which]).apply()
                render("quality")
            }.show()
        })
        body.addView(label("El volumen se controla con los botones del dispositivo o del televisor.\nYouTube, Kick y señales web se reproducen dentro de la app.\nGolBoliviaLive · Versión ${BuildConfig.VERSION_NAME}", 14f, true))
    }

    private fun catalogChanged() {
        loading = matchesLoading || channelsLoading
        notice = listOf(matchNotice, channelNotice).filter { it.isNotBlank() }.joinToString(" · ")
            .ifBlank { if (loading) "Actualizando datos…" else "Catálogo actualizado · Mantén OK para favoritos" }
        selected?.let { current ->
            (matches + channels).find { it.id == current.id }?.let { updated ->
                selected = current.copy(title = updated.title, subtitle = updated.subtitle, home = updated.home, away = updated.away,
                    status = updated.status, score = updated.score, category = updated.category, live = updated.live)
                watchHeader?.text = "${updated.title} · ${updated.score} · ${updated.status}"
            }
        }
        if (active && selected == null) {
            val count = when (section) { "Canales" -> channels.size; "Partidos" -> matches.size; else -> (matches + channels).size }
            if (page * 24 >= count) page = 0
            render(currentFocus?.tag as? String)
        }
    }

    private fun loadCatalog(forceChannels: Boolean = false) {
        if (!active) return
        if (!matchesLoading) {
            matchesLoading = true
            executor.execute {
                val result = runCatching {
                    val raw = Catalog.fetch("/api/live-events", 12000)
                    EspnSync.preview(raw) to TeamCatalog.load(raw, false)
                }
                handler.post {
                    if (isDestroyed) return@post
                    result.onSuccess { (events, teams) ->
                        latestEvents = events; latestTeams = teams; matchNotice = ""
                        matches = Catalog.matches(latestEvents, latestTeams)
                        var remaining = 2
                        fun complete() {
                            remaining--
                            matchesLoading = remaining > 0
                            matches = Catalog.matches(latestEvents, latestTeams)
                            catalogChanged()
                        }
                        executor.execute {
                            val enriched = runCatching { EspnSync.refresh(events) }
                            handler.post {
                                if (!isDestroyed) {
                                    enriched.onSuccess { latestEvents = it }
                                    enriched.onFailure { matchNotice = "No se pudo actualizar ESPN" }
                                    complete()
                                }
                            }
                        }
                        executor.execute {
                            val enriched = runCatching { TeamCatalog.load(events) }
                            handler.post {
                                if (!isDestroyed) { enriched.onSuccess { latestTeams = it }; complete() }
                            }
                        }
                    }.onFailure {
                        matchesLoading = false
                        matchNotice = "No se pudieron actualizar los partidos. Se conserva el catálogo anterior"
                    }
                    catalogChanged()
                }
            }
        }
        if (!channelsLoading && (forceChannels || System.currentTimeMillis() - channelsLoadedAt > 300000)) {
            channelsLoading = true
            executor.execute {
                val result = runCatching { Catalog.channels(Catalog.fetch("/api/iptv/sports", 12000)) }
                handler.post {
                    if (isDestroyed) return@post
                    channelsLoading = false
                    result.onSuccess { channels = it; channelsLoadedAt = System.currentTimeMillis(); channelNotice = "" }
                        .onFailure { channelNotice = "No se pudieron actualizar los canales. Se conserva el catálogo anterior" }
                    catalogChanged()
                }
            }
        }
        loading = matchesLoading || channelsLoading
    }

    private fun open(item: WatchItem, restored: PlaybackSnapshot? = null) {
        returnFocus = item.id
        if (item.sources.isEmpty()) {
            AlertDialog.Builder(this).setTitle(item.title)
                .setMessage("${item.status} · ${item.score}\n${item.subtitle}\nTodavía no hay una señal disponible para este partido.")
                .setPositiveButton("Aceptar", null)
                .setNeutralButton(if (item.id in favorites()) "Quitar favorito" else "Guardar favorito") { _, _ -> toggleFavorite(item) }.show()
            return
        }
        releasePlayer()
        selected = item
        sourceIndex = restored?.sourceIndex ?: 0
        resumePlayback = restored?.playWhenReady ?: preferences.getBoolean("autoplay", true)
        val screen = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }
        videoHost = FrameLayout(this)
        screen.addView(videoHost, FrameLayout.LayoutParams(-1, -1))
        val chrome = FrameLayout(this)
        watchChrome = chrome
        val information = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(8), dp(72), dp(8))
            setBackgroundColor(Color.argb(185, 8, 13, 22))
        }
        watchHeader = label("${item.title} · ${item.score} · ${item.status}", 18f)
        information.addView(watchHeader)
        playerStatus = label("Preparando señal…", 13f, true)
        information.addView(playerStatus)
        chrome.addView(information, FrameLayout.LayoutParams(-1, -2, Gravity.TOP))
        val toolbar = HorizontalScrollView(this).apply {
            setPadding(dp(12), dp(8), dp(12), dp(8)); setBackgroundColor(Color.argb(185, 8, 13, 22))
            addView(LinearLayout(this@MainActivity).apply {
                addView(button("Volver", "watch:back") { closePlayer() })
                addView(button("Reintentar") { startPlayer() })
                if (item.sources.size > 1) addView(button("Siguiente señal") {
                    sourceIndex = (sourceIndex + 1) % item.sources.size; startPlayer()
                })
                addView(button("Encajar / Llenar") {
                    val zoom = !preferences.getBoolean("zoomVideo", false)
                    preferences.edit().putBoolean("zoomVideo", zoom).apply()
                    playerView?.resizeMode = if (zoom) AspectRatioFrameLayout.RESIZE_MODE_ZOOM else AspectRatioFrameLayout.RESIZE_MODE_FIT
                    playerStatus?.text = if (playerView != null) {
                        if (zoom) "Llenar: se recortan los bordes para ocupar toda la pantalla." else "Encajar: se conserva la imagen completa."
                    } else "En reproductores web usa el ajuste de imagen del proveedor."
                })
                addView(button("Cursor iframe") {
                    if (embedded != null) {
                        embedded?.togglePointer()
                        showWatchChrome(false)
                    } else playerStatus?.text = "El cursor se utiliza con señales web."
                })
                addView(button("Favorito ★") { toggleFavorite(item) })
            })
        }
        chrome.addView(toolbar, FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM))
        screen.addView(chrome, FrameLayout.LayoutParams(-1, -1))
        watchMenu = button("☰", "watch:menu") { showWatchChrome(!chromeVisible) }.apply { contentDescription = "Mostrar u ocultar controles" }
        screen.addView(watchMenu, FrameLayout.LayoutParams(dp(60), dp(52), Gravity.TOP or Gravity.END).apply {
            setMargins(dp(4), dp(4), dp(8), dp(4))
        })
        setContentView(screen)
        applyImmersive()
        showWatchChrome(true)
        startPlayer()
    }

    private fun startPlayer() {
        val item = selected ?: return
        if (!active) return
        val source = item.sources.getOrNull(sourceIndex) ?: return
        releasePlayer()
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        playerStatus?.text = "Cargando ${source.provider}…"
        if (source.embedded) {
            runCatching {
                EmbeddedPlayer(this, source, resumePlayback) { message ->
                    if (selected?.id == item.id && active) {
                        playerStatus?.text = message
                        if (message.contains("no pudo", true) || message.contains("no se pudo", true) || message.contains("HTTP") || message.contains("no permite", true)) showWatchChrome(true)
                    }
                }.also { embedded = it; videoHost?.addView(it, FrameLayout.LayoutParams(-1, -1)) }
            }.onFailure {
                playerStatus?.text = "No se pudo iniciar Android System WebView. Actualízalo para reproducir ${source.provider} dentro de la app."
                window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
            return
        }
        playerView = PlayerView(this).apply {
            useController = true; controllerShowTimeoutMs = 5000; isFocusable = true
            resizeMode = if (preferences.getBoolean("zoomVideo", false)) AspectRatioFrameLayout.RESIZE_MODE_ZOOM else AspectRatioFrameLayout.RESIZE_MODE_FIT
            setShowNextButton(false); setShowPreviousButton(false)
        }
        videoHost?.addView(playerView, FrameLayout.LayoutParams(-1, -1))
        val instance = ExoPlayer.Builder(this).build()
        instance.setAudioAttributes(AudioAttributes.DEFAULT, true)
        player = instance
        playerView?.player = instance
        instance.trackSelectionParameters = instance.trackSelectionParameters.buildUpon()
            .setMaxVideoSize(Int.MAX_VALUE, preferences.getInt("maxHeight", Int.MAX_VALUE)).build()
        instance.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                if (player !== instance) return
                playerStatus?.text = when (state) {
                    Player.STATE_BUFFERING -> "Cargando ${source.provider}…"
                    Player.STATE_READY -> "${source.provider} · OK: controles · Atrás: catálogo"
                    Player.STATE_ENDED -> "La transmisión ha terminado."
                    else -> "Preparando señal…"
                }
            }
            override fun onPlayerError(error: PlaybackException) {
                if (player !== instance) return
                showWatchChrome(true)
                var cause: Throwable? = error
                var status: Int? = null
                while (cause != null) {
                    if (cause is HttpDataSource.InvalidResponseCodeException) status = cause.responseCode
                    cause = cause.cause
                }
                if (sourceIndex + 1 < item.sources.size) {
                    resumePlayback = instance.playWhenReady
                    sourceIndex++
                    handler.post { if (active && selected?.id == item.id && player === instance) startPlayer() }
                } else {
                    playerStatus?.text = when (status) {
                        403 -> "HTTP 403: el proveedor denegó el acceso a esta señal."
                        404 -> "HTTP 404: la señal ya no está disponible."
                        null -> "No se pudo reproducir (${error.errorCodeName}). Pulsa Reintentar."
                        else -> "Error HTTP $status del proveedor. Puedes reintentar."
                    }
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
            }
        })
        val media = MediaItem.Builder().setUri(source.url)
        if (!Uri.parse(source.url).path.orEmpty().endsWith(".mp4", ignoreCase = true)) media.setMimeType(MimeTypes.APPLICATION_M3U8)
        instance.setMediaItem(media.build())
        instance.prepare()
        instance.playWhenReady = resumePlayback
        playerView?.requestFocus()
    }

    private fun releasePlayer() {
        playerView?.player = null
        player?.release(); player = null; playerView = null
        embedded?.close(); embedded = null
        videoHost?.removeAllViews()
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun closePlayer() {
        releasePlayer(); selected = null; videoHost = null; watchHeader = null; playerStatus = null; watchChrome = null; watchMenu = null
        handler.removeCallbacks(hideChrome)
        applyImmersive()
        render(returnFocus)
    }

    override fun dispatchTouchEvent(event: MotionEvent): Boolean {
        val watching = selected != null
        val wasHidden = watching && !chromeVisible
        if (watching && chromeVisible) {
            handler.removeCallbacks(hideChrome)
            handler.postDelayed(hideChrome, 5000)
        }
        val handled = super.dispatchTouchEvent(event)
        if (wasHidden && event.actionMasked == MotionEvent.ACTION_UP && selected != null) showWatchChrome(true)
        return handled
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (selected != null && chromeVisible && event.action == KeyEvent.ACTION_DOWN) {
            handler.removeCallbacks(hideChrome)
            handler.postDelayed(hideChrome, 5000)
        }
        if (selected != null && event.keyCode == KeyEvent.KEYCODE_MENU) {
            if (event.action == KeyEvent.ACTION_DOWN) {
                showWatchChrome(!chromeVisible)
                if (chromeVisible) window.decorView.findViewWithTag<View>("watch:back")?.requestFocus()
            }
            return true
        }
        if (selected != null && event.keyCode in listOf(KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_MEDIA_PLAY, KeyEvent.KEYCODE_MEDIA_PAUSE)) {
            if (player != null) {
                if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) player?.let {
                    it.playWhenReady = when (event.keyCode) {
                        KeyEvent.KEYCODE_MEDIA_PLAY -> true
                        KeyEvent.KEYCODE_MEDIA_PAUSE -> false
                        else -> !it.playWhenReady
                    }
                }
                return true
            }
            if (embedded != null && selected?.sources?.getOrNull(sourceIndex)?.provider == "YouTube") {
                if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) embedded?.mediaKey(when(event.keyCode) {
                    KeyEvent.KEYCODE_MEDIA_PLAY -> true
                    KeyEvent.KEYCODE_MEDIA_PAUSE -> false
                    else -> null
                })
                return true
            }
        }
        if (selected?.channel == true && preferences.getBoolean("channelKeys", true) &&
            event.keyCode in listOf(KeyEvent.KEYCODE_CHANNEL_UP, KeyEvent.KEYCODE_CHANNEL_DOWN)) {
            if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) {
                val playable = channels.filter { it.sources.isNotEmpty() }
                val index = playable.indexOfFirst { it.id == selected?.id }
                if (index >= 0 && playable.isNotEmpty()) {
                    val step = if (event.keyCode == KeyEvent.KEYCODE_CHANNEL_UP) 1 else -1
                    open(playable[(index + step + playable.size) % playable.size])
                }
            }
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    @Deprecated("Compatible with Android TV remotes on API 23+")
    override fun onBackPressed() {
        if (embedded?.exitFullscreen() == true) { applyImmersive(); return }
        if (selected != null) { closePlayer(); return }
        if (section != "Inicio" || query.isNotBlank()) { section = "Inicio"; query = ""; page = 0; render(); return }
        AlertDialog.Builder(this).setTitle("¿Salir de GolBoliviaLive?")
            .setPositiveButton("Salir") { _, _ -> finish() }.setNegativeButton("Seguir viendo", null).show()
    }
}
