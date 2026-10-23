package com.golbolivialive.tv

import org.json.JSONObject
import java.text.Normalizer

object TeamCatalog {
    private var clubs = JSONObject()
    private var clubsLoaded = 0L
    private val leagues = mutableMapOf<String, Pair<Long, List<Pair<List<String>, String>>>>()
    private val aliases = mapOf("wilstermann" to "Jorge Wilstermann", "oriente" to "Oriente Petrolero",
        "always" to "Always Ready", "nacional" to "Nacional Potosí", "san_antonio" to "San Antonio Bulo Bulo",
        "gv_san_jose" to "Gualberto Villarroel San José", "u_vinto" to "Universitario de Vinto")
    private val local = setOf("real_madrid", "barcelona", "atletico_madrid", "athletic_club", "sevilla", "real_betis",
        "real_sociedad", "villarreal", "valencia", "man_city", "arsenal", "liverpool", "man_united", "chelsea",
        "tottenham", "aston_villa", "newcastle", "girona")

    fun normalize(name: String): String = Normalizer.normalize(name, Normalizer.Form.NFD)
        .replace(Regex("\\p{M}"), "").lowercase()
        .replace(Regex("\\b(club|deportivo|de|futbol|football|fc|cf|ca|afc|cd)\\b"), "")
        .replace(Regex("[^a-z0-9]"), "")

    fun crest(value: String): String = when {
        value.matches(Regex("/crests/[a-z0-9_-]+\\.png")) -> BuildConfig.PUBLIC_BASE_URL + value
        else -> Catalog.https(value).orEmpty()
    }

    private fun league(club: JSONObject): String {
        val source = normalize(club.optString("country") + " " + club.optString("league"))
        val codes = mapOf("BO" to "bol.1", "ES" to "esp.1", "GB" to "eng.1", "ENG" to "eng.1", "AR" to "arg.1",
            "BR" to "bra.1", "CO" to "col.1", "PE" to "per.1", "CL" to "chi.1", "UY" to "uru.1")
        codes[club.optString("country").uppercase()]?.let { return it }
        return listOf("bolivia" to "bol.1", "espana|spain|laliga" to "esp.1", "inglaterra|england|premier" to "eng.1",
            "argentina" to "arg.1", "brasil|brazil" to "bra.1", "colombia" to "col.1", "peru" to "per.1",
            "chile" to "chi.1", "uruguay" to "uru.1", "italia|seriea" to "ita.1", "alemania|bundesliga" to "ger.1",
            "francia|ligue1" to "fra.1", "portugal" to "por.1", "ecuador" to "ecu.1", "paraguay" to "par.1")
            .firstOrNull { Regex(it.first).containsMatchIn(source) }?.second.orEmpty()
    }

    fun load(events: JSONObject): Map<String, TeamInfo> {
        val now = System.currentTimeMillis()
        if (now - clubsLoaded > 300000) runCatching { Catalog.fetch("/api/clubs").getJSONObject("clubs") }
            .onSuccess { clubs = it; clubsLoaded = now }
        val rows = events.getJSONArray("events")
        val ids = (0 until rows.length()).flatMap { listOf(rows.getJSONObject(it).optString("homeTeam"), rows.getJSONObject(it).optString("awayTeam")) }.distinct()
        return ids.associateWith { id ->
            val club = clubs.optJSONObject(id) ?: JSONObject()
            val name = club.optString("shortName").ifBlank { club.optString("name").ifBlank { id.replace('_', ' ') } }
            var logo = crest(club.optString("logoUrl"))
            if (logo.isBlank() && id in local) logo = crest("/crests/$id.png")
            val competition = league(club)
            if (logo.isBlank() && competition.isNotBlank()) {
                var cached = leagues[competition]
                if (cached == null || now > cached.first) {
                    val loaded = runCatching {
                        val teams = Catalog.fetch("/api/football-api/teams?league=$competition").getJSONArray("teams")
                        (0 until teams.length()).map { index ->
                            val team = teams.getJSONObject(index); val names = team.getJSONArray("names")
                            (0 until names.length()).map { normalize(names.getString(it)) } to crest(team.optString("logoUrl"))
                        }
                    }.getOrDefault(emptyList())
                    cached = (now + if (loaded.isEmpty()) 300000 else 7200000) to loaded
                    leagues[competition] = cached
                }
                val names = listOf(name, club.optString("name"), aliases[id].orEmpty()).map(::normalize).filter { it.isNotBlank() }
                logo = cached.second.firstOrNull { entry -> entry.first.any { it in names } }?.second.orEmpty()
            }
            TeamInfo(id, name.ifBlank { "Equipo por confirmar" }, logo, club.optString("primaryColor", "#15314D"))
        }
    }
}
