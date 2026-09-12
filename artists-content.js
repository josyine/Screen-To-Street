// ==========================================
// Contenu partagé "Explore Artists" (artists.html + map-artists.html).
// ==========================================
// Demande du 12/09/2026 ("Fais en sorte que le contenu de artists.html et
// map-artists.html soient le même") : artists.html (page publique, non connectée) et
// map-artists.html (page réelle de l'app, connectée) affichaient chacune leur propre
// copie de GROUPS/GROUP_DETAILS/openDetail(), qui avaient fini par diverger (chiffres
// figés obsolètes sur artists.html, aucune fiche enrichie). Comme locations-data.js,
// ce fichier est un script classique (pas de module ES) chargé à l'identique par les
// deux pages via <script src="artists-content.js?...">, pour que toute future
// modification profite aux deux pages sans copier-coller — voir les notes détaillées
// dans CLAUDE.md / le ticket pour l'architecture attendue.
//
// Ce qui reste volontairement HORS de ce fichier (propre à chaque page) :
//  - le dictionnaire i18n t_artists (chrome de page : titre, libellés de nav) ;
//  - le câblage des crayons d'édition admin (modale #dest-edit-overlay, qui n'existe
//    que sur map-artists.html) — renderArtistDetailHtml() ci-dessous se contente de
//    rendre le crayon caché (hidden) et d'appeler openArtistEditModal() de façon
//    défensive, sans jamais supposer qu'elle existe.

// --- DONNÉES DES GROUPES (bilingue) ---
window.GROUPS = {
  en: {
      bts: { name: "BTS", photo: "https://images.unsplash.com/photo-1621252179027-94459d278660?w=800", blurb: "From a cramped Gangnam practice room to a custom-built mountain retreat in Chuncheon, BTS's map spans nine years and three countries — the most complete journey on Screen To Street.", members: [["RM","#8B5CF6"],["Jin","#7C4FE0"],["Suga","#8B5CF6"],["J-Hope","#7C4FE0"],["Jimin","#8B5CF6"],["V","#7C4FE0"],["Jungkook","#8B5CF6"]], locations: 12, countries: 3, categories: "Run BTS, Bon Voyage, MV Location, Museums, Restaurants, Cafe, Concerts, Fashion, Landmarks", since: "2013" },
      blackpink: { name: "Blackpink", photo: "https://images.unsplash.com/photo-1493225457124-a1a2a5f0fa47?w=800", blurb: "Just getting started — the first stop on Blackpink's map is a chic Gangnam cafe spotted on Jennie's Instagram. More locations are added as they're confirmed.", members: [["Jisoo","#D42759"],["Jennie","#B23554"],["Rosé","#D42759"],["Lisa","#B23554"]], locations: 1, countries: 1, categories: "Cafe, Restaurants, MV Location, Pop-up Store, Concerts, Fashion", since: "2016" },
      twice: { name: "Twice", photo: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800", blurb: "Nine members, no shortage of stories — Twice's map is next in line to be built. Their filming locations and favorite spots are being researched.", members: [["Nayeon","#2E3644"],["Jeongyeon","#5B6472"],["Momo","#2E3644"],["Sana","#5B6472"],["Jihyo","#2E3644"],["Mina","#5B6472"],["Dahyun","#2E3644"],["Chaeyoung","#5B6472"],["Tzuyu","#2E3644"]], locations: 0, countries: 0, categories: "Cafe, Concerts, Fashion", since: "2015" },
      seventeen: { name: "Seventeen", photo: "https://images.unsplash.com/photo-1540039155732-6134b281165e?w=800", blurb: "Thirteen members and a world tour's worth of stages — Seventeen's footprint on Screen To Street is on the way.", members: [["S.Coups","#C97A9A"],["Jeonghan","#D9A5BE"],["Joshua","#C97A9A"],["Jun","#D9A5BE"],["Hoshi","#C97A9A"],["Wonwoo","#D9A5BE"],["Woozi","#C97A9A"],["DK","#D9A5BE"],["Mingyu","#C97A9A"],["The8","#D9A5BE"],["Seungkwan","#C97A9A"],["Vernon","#D9A5BE"],["Dino","#C97A9A"]], locations: 0, countries: 0, categories: "Concerts, Landmarks", since: "2015" },
      katseye: { name: "Katseye", photo: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800", blurb: "The newest addition to the roster — pop-up stores and fashion moments are next on the map as Katseye's presence grows.", members: [["Sophia","#5B6472"],["Lara","#8996A3"],["Manon","#5B6472"],["Daniela","#8996A3"],["Yoonchae","#5B6472"],["Megan","#8996A3"]], locations: 0, countries: 0, categories: "Pop-up Store, Fashion", since: "2024" },
      txt: { name: "TXT", photo: "https://images.unsplash.com/photo-1501612780327-45045538702b?w=800", blurb: "Five members, one story about to begin — TXT's first mapped location is in the works.", members: [["Soobin","#A78BFA"],["Yeonjun","#C4B5FD"],["Beomgyu","#A78BFA"],["Taehyun","#C4B5FD"],["Huening Kai","#A78BFA"]], locations: 0, countries: 0, categories: "MV Location, Concerts", since: "2019" }
  },
  fr: {
      bts: { name: "BTS", photo: "https://images.unsplash.com/photo-1621252179027-94459d278660?w=800", blurb: "D'une petite salle d'entraînement à Gangnam à un refuge majestueux dans les montagnes de Chuncheon, la carte de BTS couvre neuf ans et trois pays — le voyage le plus complet sur Screen To Street.", members: [["RM","#8B5CF6"],["Jin","#7C4FE0"],["Suga","#8B5CF6"],["J-Hope","#7C4FE0"],["Jimin","#8B5CF6"],["V","#7C4FE0"],["Jungkook","#8B5CF6"]], locations: 12, countries: 3, categories: "Run BTS, Bon Voyage, MV Location, Musées, Restaurants, Café, Concerts, Mode, Lieux mythiques", since: "2013" },
      blackpink: { name: "Blackpink", photo: "https://images.unsplash.com/photo-1493225457124-a1a2a5f0fa47?w=800", blurb: "Un début prometteur — le premier lieu de Blackpink est un café chic de Gangnam repéré sur l'Instagram de Jennie. D'autres lieux seront ajoutés prochainement.", members: [["Jisoo","#D42759"],["Jennie","#B23554"],["Rosé","#D42759"],["Lisa","#B23554"]], locations: 1, countries: 1, categories: "Café, Restaurants, MV Location, Pop-up Store, Concerts, Mode", since: "2016" },
      twice: { name: "Twice", photo: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800", blurb: "Neuf membres, des histoires à revendre — la carte de Twice est la prochaine sur la liste. Leurs lieux de tournage et endroits favoris sont en cours d'analyse.", members: [["Nayeon","#2E3644"],["Jeongyeon","#5B6472"],["Momo","#2E3644"],["Sana","#5B6472"],["Jihyo","#2E3644"],["Mina","#5B6472"],["Dahyun","#2E3644"],["Chaeyoung","#5B6472"],["Tzuyu","#2E3644"]], locations: 0, countries: 0, categories: "Café, Concerts, Mode", since: "2015" },
      seventeen: { name: "Seventeen", photo: "https://images.unsplash.com/photo-1540039155732-6134b281165e?w=800", blurb: "Treize membres et l'équivalent d'une tournée mondiale — l'empreinte de Seventeen sur Screen To Street est en route.", members: [["S.Coups","#C97A9A"],["Jeonghan","#D9A5BE"],["Joshua","#C97A9A"],["Jun","#D9A5BE"],["Hoshi","#C97A9A"],["Wonwoo","#D9A5BE"],["Woozi","#C97A9A"],["DK","#D9A5BE"],["Mingyu","#C97A9A"],["The8","#D9A5BE"],["Seungkwan","#C97A9A"],["Vernon","#D9A5BE"],["Dino","#C97A9A"]], locations: 0, countries: 0, categories: "Concerts, Lieux mythiques", since: "2015" },
      katseye: { name: "Katseye", photo: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800", blurb: "La petite dernière de la sélection — les pop-up stores et moments de mode seront les prochains sur la carte de Katseye.", members: [["Sophia","#5B6472"],["Lara","#8996A3"],["Manon","#5B6472"],["Daniela","#8996A3"],["Yoonchae","#5B6472"],["Megan","#8996A3"]], locations: 0, countries: 0, categories: "Pop-up Store, Mode", since: "2024" },
      txt: { name: "TXT", photo: "https://images.unsplash.com/photo-1501612780327-45045538702b?w=800", blurb: "Cinq membres, une histoire qui ne fait que commencer — le premier lieu de TXT est en cours d'ajout.", members: [["Soobin","#A78BFA"],["Yeonjun","#C4B5FD"],["Beomgyu","#A78BFA"],["Taehyun","#C4B5FD"],["Huening Kai","#A78BFA"]], locations: 0, countries: 0, categories: "MV Location, Concerts", since: "2019" }
  }
};

// Contenu encyclopédique enrichi (KPI, sections narratives, bios des membres, frise
// chronologique) pour la fiche détaillée de chaque groupe. Volontairement en anglais
// uniquement pour l'instant (comme le reste des contenus longs de cette page) :
// renderArtistDetailHtml() y recourt quel que soit currentLang, en repli au-dessus des
// champs déjà traduits (name/blurb/categories) qui restent, eux, bilingues.
window.GROUP_DETAILS = {
  bts: {
    agency: "HYBE", fandom: "ARMY", debut: "Jun 13, 2013",
    sections: [
      ["Formation", "BTS took shape gradually between 2010 and 2013 under Big Hit Entertainment, a small agency founded by producer Bang Si-hyuk with no major idol act to its name at the time. The lineup shifted several times during a long trainee period — some early members left before debut — before settling on the seven who would form the group: RM, Jin, Suga, J-Hope, Jimin, V and Jungkook, the youngest of whom joined as a young teenager after being scouted at an audition in Busan."],
      ["Beginnings (2013–2016)", "BTS debuted on June 13, 2013 with \"No More Dream,\" the lead single of a trilogy of albums that leaned into hip-hop and addressed teenage frustration, academic pressure and the search for identity — subjects most idol groups of the era avoided in favour of glossier concepts. Unusually for a rookie act, the members were credited on much of their own material from the very beginning, with RM and Suga in particular writing and producing extensively.", "Commercial success was slow at first: the group built its audience less through television exposure, which smaller agencies struggled to secure, than through an unusually direct relationship with fans on social media and through self-produced content, laying the groundwork for what would become ARMY. By 2015, the \"The Most Beautiful Moment in Life\" album series marked a turning point, with the single \"Run\" and later \"Blood Sweat & Tears\" (2016) bringing the group's first major domestic recognition and awards."],
      ["Breakthrough (2017–2019)", "The \"Love Yourself\" album series pushed BTS from a large domestic following into genuine international relevance. \"DNA\" became their first entry on the Billboard Hot 100 in 2017, and the group's growing US visibility — including consecutive wins at the Billboard Music Awards' Top Social Artist category — culminated in a performance at the American Music Awards in 2017, then a first appearance at the Grammy Awards in 2019.", "In September 2018, RM delivered a speech at the United Nations General Assembly as part of a partnership with UNICEF's \"Love Myself\" anti-violence campaign, a moment widely seen as marking the group's shift from a pop act into a genuine cultural voice."],
      ["Global icons (2020–2021)", "\"Dynamite,\" released in August 2020, gave BTS its first Billboard Hot 100 Number One as an all-English single, followed by further chart-topping releases including \"Butter\" and \"Permission to Dance.\" The group earned three consecutive Grammy nominations for Best Pop Duo/Group Performance during this period, and closed out 2021 and 2022 with the \"Permission to Dance On Stage\" concert series — including a homecoming run at Seoul's Olympic Stadium — their last shows together as a full group before enlistment."],
      ["Hiatus & military service (2022–2024)", "In June 2022, the group announced a period stepping back from group activities to focus on individual projects — a hiatus that coincided with, and was ultimately shaped by, South Korea's mandatory military service requirement for able-bodied men. Jin became the first member to enlist in December 2022, with the rest of the group following individually over the next two years. The period nonetheless produced a wave of solo material: Jin's \"The Astronaut,\" Suga's \"D-Day\" as Agust D, J-Hope's \"Jack in the Box\" and a Lollapalooza headline set, Jimin's \"Face,\" V's \"Layover,\" and Jungkook's \"Seven,\" which became one of the best-performing singles by a solo K-pop act to date."],
      ["Today — reunion (2025–2026)", "With all seven members having completed their service by mid-2025, BTS began regrouping for new group material and, in 2026, launched the \"ARIRANG\" World Tour — their first joint stadium run since 2022. For a fandom that had spent over two years following seven separate solo careers, the tour marked less a comeback than a continuation: the same group picking the story back up close to where it had paused."]
    ],
    members: [
      { name: "RM", real: "Kim Namjoon", role: "Leader · Main Rapper", color: "#8B5CF6", bio: "The group's leader since debut and its primary English-language spokesperson, RM has written or co-written a large share of BTS's catalogue. Known for his art collection and his interest in literature, he's also released solo work under his own name, including the albums \"mono.,\" \"Indigo\" and \"Right Place, Wrong Person.\"" },
      { name: "Jin", real: "Kim Seokjin", role: "Vocalist · Eldest member", color: "#7C4FE0", bio: "The oldest member and the first to enlist for military service, Jin is known for a broad vocal range, a well-documented love of cooking, and a self-deprecating sense of humour that made him one of the group's most consistent sources of comic relief. His solo singles \"Super Tuna,\" \"The Astronaut\" and \"Running Wild\" have each found commercial success in their own right." },
      { name: "Suga", real: "Min Yoongi", role: "Rapper · Producer", color: "#8B5CF6", bio: "A rapper and producer who has written and produced for artists well beyond BTS, Suga also records more personal, introspective material under the alias Agust D — including the album \"D-Day,\" widely regarded as one of the most candid releases in his catalogue, touching on mental health and the pressures of fame." },
      { name: "J-Hope", real: "Jung Hoseok", role: "Rapper · Main Dancer", color: "#7C4FE0", bio: "The group's main dancer and often its choreographic anchor, J-Hope became the first BTS member to headline a major Western festival as a solo act, closing Lollapalooza Chicago in 2022. His solo work, including \"Hope World\" and \"Jack in the Box,\" leans into a more upbeat, genre-blending sound distinct from his groupmates' solo output." },
      { name: "Jimin", real: "Park Jimin", role: "Vocalist · Lead Dancer", color: "#8B5CF6", bio: "Known for a falsetto-heavy vocal style and precise, contemporary-influenced choreography, Jimin's solo singles \"Like Crazy\" and \"Who\" both topped international charts, with \"Like Crazy\" earning him a Grammy nomination — the first solo nomination for a member of the group." },
      { name: "V", real: "Kim Taehyung", role: "Vocalist", color: "#7C4FE0", bio: "Recognisable for a distinctive low baritone that stands apart in the group's vocal blend, V is also known for a strong interest in photography and visual art, which shaped the more film-influenced, understated sound of his solo album \"Layover.\"" },
      { name: "Jungkook", real: "Jeon Jungkook", role: "Vocalist · Maknae", color: "#8B5CF6", bio: "The youngest member, scouted as a young teenager and often described as the group's most all-round performer — vocals, dance and production all included. His 2023 solo single \"Seven\" became one of the best-charting songs ever released by a K-pop soloist, and his debut album \"Golden\" followed later that year." }
    ],
    timeline: [
      ["2013", "Debut with \"No More Dream.\"", "normal"],
      ["2015–16", "\"Run\" and \"Blood Sweat & Tears\" bring first major domestic recognition.", "normal"],
      ["2017", "First Billboard Hot 100 entry, \"DNA.\"", "normal"],
      ["2018", "RM addresses the United Nations General Assembly.", "normal"],
      ["2020", "\"Dynamite\" becomes their first US Number One.", "normal"],
      ["2022–24", "Hiatus and individual military service; wave of solo releases.", "muted"],
      ["2025–26", "Full reunion and the \"ARIRANG\" World Tour.", "accent"]
    ]
  },
  blackpink: {
    agency: "YG Entertainment", fandom: "BLINK", debut: "Aug 8, 2016",
    sections: [
      ["Formation", "Blackpink's members trained separately for years under YG Entertainment — Jisoo since 2011, Jennie since 2010 after early years training in New Zealand and Korea, Rosé since 2012, and Lisa, recruited from Thailand, since 2011 — before YG confirmed the long-rumoured group with a teaser campaign in mid-2016, its first new girl group in seven years."],
      ["Debut & rise (2016–2018)", "The group debuted in August 2016 with the double single \"Boombayah\" / \"Whistle,\" both entering the charts immediately — an unusually strong commercial start for a rookie act. Momentum built quickly through 2017's \"As If It's Your Last,\" and by 2018 \"Ddu-Du Ddu-Du\" had become a global viral moment, breaking YouTube records for a K-pop group and pulling Blackpink into a different tier of international visibility almost overnight."],
      ["Global breakout (2019–2020)", "Blackpink became the first K-pop girl group to perform at Coachella in April 2019. \"Kill This Love\" and collaborations including \"Sour Candy\" with Lady Gaga and \"Ice Cream\" with Selena Gomez extended their reach into Western pop, and \"How You Like That\" (2020) set new YouTube premiere records. Their first full-length album, \"The Album\" (2020), debuted at Number Two on the Billboard 200 — the highest charting album by a K-pop girl group at the time."],
      ["World tour & solo era (2021–2023)", "\"Born Pink\" (2022) became the group's first Number One album on the Billboard 200, backed by the highest-grossing concert tour ever by a girl group. Between group activities, each member released solo material for the first time: Jisoo's \"ME,\" Jennie's \"Solo\" and later \"You & Me,\" Rosé's \"R,\" and Lisa's \"Lalisa,\" \"Money\" and \"Rockstar.\""],
      ["Today (2024–2026)", "The members have increasingly balanced group promotions with independent ventures — Jisoo's acting work, Jennie's own label OA and debut album \"Ruby,\" Rosé's global hit \"APT.\" with Bruno Mars and solo album \"rosie,\" and Lisa's Grammy-nominated solo run alongside a role on HBO's \"The White Lotus.\" The group has continued to regroup for new releases and tours around these individual careers."]
    ],
    members: [
      { name: "Jisoo", real: "Kim Jisoo", role: "Vocalist · Visual", color: "#D42759", bio: "The eldest member and one of the group's main vocalists, Jisoo has built a parallel acting career alongside Blackpink activities, including a lead role in the Korean drama \"Snowdrop,\" and released her first solo EP, \"ME,\" in 2023." },
      { name: "Jennie", real: "Kim Jennie", role: "Main Rapper · Vocalist", color: "#B23554", bio: "Known equally for her rap delivery and her standing as a global fashion figure — she's a longtime Chanel ambassador — Jennie's 2018 solo single \"Solo\" was a career-defining hit, followed by \"You & Me\" and her debut solo album \"Ruby\" (2025) under her own label, OA." },
      { name: "Rosé", real: "Roseanne Park", role: "Main Vocalist", color: "#D42759", bio: "Born in New Zealand and raised in Australia before moving to Korea to train, Rosé is regarded as the group's strongest technical vocalist. Her 2024 collaboration with Bruno Mars, \"APT.,\" became a worldwide crossover hit, and her debut solo album \"rosie\" followed the same year." },
      { name: "Lisa", real: "Lalisa Manobal", role: "Main Dancer · Rapper", color: "#B23554", bio: "The group's Thai member and main dancer, Lisa was the first Blackpink member to release solo music, with \"Lalisa\" and \"Money\" (2021) followed by \"Rockstar\" and a Grammy-nominated solo run. She has also taken on acting work, including a role in HBO's \"The White Lotus\" Season 3 (2025)." }
    ],
    timeline: [
      ["2016", "Debut with \"Boombayah\" / \"Whistle.\"", "normal"],
      ["2018", "\"Ddu-Du Ddu-Du\" becomes a global viral hit.", "normal"],
      ["2019", "First K-pop girl group to perform at Coachella.", "normal"],
      ["2020", "\"The Album\" debuts at #2 on the Billboard 200.", "normal"],
      ["2022", "\"Born Pink\" world tour, the highest-grossing by a girl group.", "normal"],
      ["2024–25", "Solo era: \"APT.,\" \"Rockstar,\" \"Ruby.\"", "muted"],
      ["2026", "Continued group activity alongside solo careers.", "accent"]
    ]
  },
  twice: {
    agency: "JYP Entertainment", fandom: "ONCE", debut: "Oct 20, 2015",
    sections: [
      ["Formation", "Twice's nine members were selected through \"Sixteen,\" a 2015 Mnet survival show that JYP Entertainment used to cast and introduce the group before debut, an unusually public formation process at the time. The final lineup — Nayeon, Jeongyeon, Momo, Sana, Jihyo, Mina, Dahyun, Chaeyoung and Tzuyu — spans Korean, Japanese and Taiwanese members."],
      ["Debut & \"Cheer Up\" era (2015–2017)", "The group debuted in October 2015 with the mini album \"The Story Begins,\" but it was 2016's \"Cheer Up\" that turned Twice into one of the decade's defining girl groups domestically, followed by \"TT\" — whose choreography and finger-heart-adjacent poses became widely imitated — and \"Knock Knock\" and \"Likey\" the following year. The group topped major Korean year-end awards multiple years running during this stretch."],
      ["Global rise (2018–2021)", "Twice's Japanese major-label debut expanded the group's reach across one of K-pop's largest overseas markets, while releases like \"Feel Special\" (2019) built a growing English-speaking fanbase. \"The Feels\" (2021) became the group's first all-English single and their first entry on the Billboard Hot 100, marking a deliberate push into the US market."],
      ["Today (2022–2026)", "Twice has continued world touring (\"Ready To Be,\" \"This Is For\") while three Japanese members — Momo, Sana and Mina — launched the sub-unit Misamo in 2023 for Japan-focused releases. Individual members have also built out variety, acting and content careers alongside group activities, and the group remains one of the best-selling girl groups of its generation."]
    ],
    members: [
      { name: "Nayeon", real: "Im Nayeon", role: "Lead Vocalist · Eldest", color: "#2E3644", bio: "The oldest member, Nayeon released the group's first individual solo debut, \"IM NAYEON,\" in 2022, led by the single \"POP!,\" which topped Korean charts in its own right." },
      { name: "Jeongyeon", real: "Yoo Jeongyeon", role: "Lead Vocalist", color: "#5B6472", bio: "Known for powerful belting and a strong comedic presence on variety shows, Jeongyeon has stepped back from some group activities at points for health reasons while remaining an active member." },
      { name: "Momo", real: "Hirai Momo", role: "Main Dancer", color: "#2E3644", bio: "A Japanese member trained extensively in dance before debut, Momo is widely regarded as the group's strongest dancer and is part of the Japan-focused sub-unit Misamo." },
      { name: "Sana", real: "Minatozaki Sana", role: "Vocalist", color: "#5B6472", bio: "Japanese member known for bright, distinctive ad-libs and a warm variety-show persona, Sana is also a member of the sub-unit Misamo." },
      { name: "Jihyo", real: "Park Jihyo", role: "Leader · Main Vocalist", color: "#2E3644", bio: "The group's leader and longest-training member — roughly a decade before debut — Jihyo is widely credited as the anchor of Twice's vocal line." },
      { name: "Mina", real: "Myoui Mina", role: "Vocalist · Dancer", color: "#5B6472", bio: "A Japanese-American member with a contemporary dance background, Mina brings a distinct, ballet-influenced style to the group's choreography and is part of Misamo." },
      { name: "Dahyun", real: "Kim Dahyun", role: "Vocalist · Rapper", color: "#2E3644", bio: "Known for the pose from \"TT\" that became one of the group's most imitated visuals, Dahyun is also recognised for her comedic timing and variety-show appearances." },
      { name: "Chaeyoung", real: "Son Chaeyoung", role: "Rapper", color: "#5B6472", bio: "The group's main rapper, Chaeyoung is also a visual artist outside of music, having exhibited her own paintings, and is known for a close on-screen friendship with Tzuyu." },
      { name: "Tzuyu", real: "Chou Tzuyu", role: "Lead Dancer · Maknae", color: "#2E3644", bio: "The group's Taiwanese maknae, Tzuyu has been one of Twice's visual centers since debut and has taken on lead dance duties across the group's discography." }
    ],
    timeline: [
      ["2015", "Formed via \"Sixteen\"; debut with \"The Story Begins.\"", "normal"],
      ["2016", "\"Cheer Up\" and \"TT\" break the group nationally.", "normal"],
      ["2017", "Major-label debut in Japan.", "normal"],
      ["2019", "\"Feel Special\" grows the group's global fanbase.", "normal"],
      ["2021", "\"The Feels,\" first Billboard Hot 100 entry.", "normal"],
      ["2023", "Misamo sub-unit debuts for the Japanese market.", "muted"],
      ["2025–26", "World touring continues alongside solo/unit projects.", "accent"]
    ]
  },
  seventeen: {
    agency: "Pledis Entertainment (HYBE)", fandom: "CARAT", debut: "May 26, 2015",
    sections: [
      ["Formation", "Seventeen was built around an unusual concept for its debut: a fully self-producing idol group, with all 13 members split across three specialised units — Hip-Hop, Vocal and Performance — and writing, composing or choreographing a large share of their own material from the very start, rather than growing into that role over time."],
      ["Debut & early years (2015–2018)", "The group debuted in May 2015 with \"17 Carat\" and lead single \"Adore U,\" building an early reputation on tightly synchronized live choreography rather than viral moments. Releases like \"Very Nice\" and \"Don't Wanna Cry\" grew a devoted but still comparatively modest fanbase over these first few years."],
      ["Breakthrough (2019–2021)", "\"Left & Right,\" released in 2020, became a slow-building global streaming hit — its popularity spread largely through short-form video well after release, a pattern that pulled Seventeen into much wider international visibility than earlier singles had managed."],
      ["Global stadium era (2022–2026)", "Seventeen's \"_WORLD\" tour became one of the largest stadium runs by a self-producing K-pop group, and the \"FML\"/\"Rock With You\" era brought the group's first Grammy nomination, for Best Pop Duo/Group Performance. The group has maintained near-constant chart dominance in Korea across nearly a decade of continuous activity from all 13 members."]
    ],
    members: [
      { name: "S.Coups", real: "Choi Seungcheol", role: "Leader · Hip-Hop Unit", color: "#C97A9A", bio: "The group's overall leader and a member of the Hip-Hop unit, S.Coups oversees much of Seventeen's group direction alongside the unit leaders." },
      { name: "Jeonghan", real: "Yoon Jeonghan", role: "Vocal Unit", color: "#D9A5BE", bio: "Known for a laid-back, visual-forward image and a dry sense of humour on variety content, Jeonghan is part of the group's Vocal unit." },
      { name: "Joshua", real: "Hong Jisoo", role: "Vocal Unit", color: "#C97A9A", bio: "Raised in the United States before training in Korea, Joshua plays guitar and brings that influence into some of the group's acoustic-leaning material." },
      { name: "Jun", real: "Wen Junhui", role: "Performance/Hip-Hop Unit", color: "#D9A5BE", bio: "A Chinese member of the group, Jun splits time between the Performance and Hip-Hop units and has taken on acting roles outside the group." },
      { name: "Hoshi", real: "Kwon Soonyoung", role: "Performance Unit Leader", color: "#C97A9A", bio: "Leader of the Performance unit and one of the group's main choreographers, Hoshi has shaped much of Seventeen's signature dance work since debut." },
      { name: "Wonwoo", real: "Jeon Wonwoo", role: "Hip-Hop Unit", color: "#D9A5BE", bio: "Known for a distinctively deep voice within the Hip-Hop unit, Wonwoo is also recognised for his close on-screen pairing with fellow member Mingyu." },
      { name: "Woozi", real: "Lee Jihoon", role: "Vocal Unit Leader · Producer", color: "#C97A9A", bio: "Leader of the Vocal unit and the group's primary in-house producer, Woozi has written and produced a large share of Seventeen's catalogue since debut." },
      { name: "DK", real: "Lee Seokmin", role: "Vocal Unit", color: "#D9A5BE", bio: "Known within the Vocal unit for a powerful, high-note-driven vocal style, DK is frequently featured on the group's most technically demanding vocal lines." },
      { name: "Mingyu", real: "Kim Mingyu", role: "Hip-Hop/Performance Unit", color: "#C97A9A", bio: "The group's tallest member and a visual focal point, Mingyu has also contributed as a songwriter, including a writing credit on the single \"Habit.\"" },
      { name: "The8", real: "Xu Minghao", role: "Performance Unit", color: "#D9A5BE", bio: "A Chinese member with a contemporary and Wushu dance background, The8 is part of the Performance unit and has pursued solo dance and fashion projects." },
      { name: "Seungkwan", real: "Boo Seungkwan", role: "Vocal Unit", color: "#C97A9A", bio: "Known for a strong vocal presence and an outsized personality on variety and reality content, Seungkwan is part of the group's Vocal unit." },
      { name: "Vernon", real: "Hansol Vernon Chwe", role: "Hip-Hop Unit", color: "#D9A5BE", bio: "Half-American and raised bilingually, Vernon handles much of the group's English lyric writing as part of the Hip-Hop unit." },
      { name: "Dino", real: "Lee Chan", role: "Performance Unit · Maknae", color: "#C97A9A", bio: "The group's youngest member, Dino is part of the Performance unit and has taken an increasing role in choreography as the group has matured." }
    ],
    timeline: [
      ["2015", "Debut with \"17 Carat\" / \"Adore U.\"", "normal"],
      ["2017", "\"Very Nice\" grows the group's core fanbase.", "normal"],
      ["2020", "\"Left & Right\" released.", "normal"],
      ["2021", "\"Left & Right\" becomes a global streaming/viral hit.", "normal"],
      ["2022", "First Grammy nomination, Best Pop Duo/Group Performance.", "normal"],
      ["2023", "\"_WORLD\" stadium tour.", "muted"],
      ["2025–26", "Continued chart dominance and global touring.", "accent"]
    ]
  },
  katseye: {
    agency: "HYBE x Geffen Records (Dream Academy)", fandom: "Forming", debut: "Jun 6, 2024",
    sections: [
      ["Formation", "Katseye was formed through \"The Debut: Dream Academy,\" a 2023–2024 reality competition series produced jointly by HYBE and Geffen Records/Universal Music Group. Broadcast internationally on Netflix, the show used an open, Western-style casting format to build a girl group from a pool of candidates spanning multiple countries — a deliberate departure from the closed domestic trainee systems most K-pop-adjacent groups come from."],
      ["Debut (2024)", "The final six-member lineup released their debut single, \"Debut,\" in June 2024, positioning the group as one of the first HYBE-trained acts built explicitly for a global, English-language-forward audience from day one. The follow-up single \"Touch\" later that year gained significant traction on short-form video platforms, helping the group build international visibility quickly relative to its age."],
      ["Today (2025–2026)", "Katseye has continued releasing singles and building a public profile through fashion and brand partnerships as the group establishes itself. Its footprint on Screen To Street is still small and growing, reflecting a group barely two years into its career — expect this page to fill in considerably as more locations are confirmed."]
    ],
    members: [
      { name: "Sophia", real: "Sophia Laforteza", role: "Vocalist", color: "#5B6472", bio: "A Filipino-American member of the group, Sophia is one of Katseye's main vocalists and had prior experience in dance and performance before joining Dream Academy." },
      { name: "Lara", real: "Lara Raj", role: "Vocalist", color: "#8996A3", bio: "An Indian-American singer who previously competed on \"The Voice\" in the United States before joining the group through Dream Academy." },
      { name: "Manon", real: "Manon Bannerman", role: "Vocalist · Dancer", color: "#5B6472", bio: "Swiss-Ghanaian, Manon brings a dance and performance background to the group and is known for a versatile vocal and movement style." },
      { name: "Daniela", real: "Daniela Avanzini", role: "Main Dancer", color: "#8996A3", bio: "Of Cuban, Venezuelan and American background, Daniela is regarded as one of the group's strongest dancers." },
      { name: "Yoonchae", real: "Kim Yoonchae", role: "Vocalist · Youngest", color: "#5B6472", bio: "The group's youngest member, Yoonchae is Korean and brought prior idol-trainee experience into the group via Dream Academy." },
      { name: "Megan", real: "Megan Skiendiel", role: "Vocalist · Rapper", color: "#8996A3", bio: "A Korean-American member, Megan contributes both vocals and rap to the group's material." }
    ],
    timeline: [
      ["2023", "\"The Debut: Dream Academy\" competition airs.", "normal"],
      ["2024", "Group formed; debut single \"Debut\" released.", "normal"],
      ["2024", "\"Touch\" gains viral traction.", "normal"],
      ["2025–26", "Continued releases and brand partnerships as the group grows.", "accent"]
    ]
  },
  txt: {
    agency: "HYBE (Big Hit Music)", fandom: "MOA", debut: "Mar 4, 2019",
    sections: [
      ["Formation", "Tomorrow X Together (TXT) is HYBE's second group, debuting nearly six years after BTS. The five members — Soobin, Yeonjun, Beomgyu, Taehyun and Huening Kai — were selected through an unusually long and low-profile trainee and audition process, with the group built around a deliberate \"coming-of-age\" concept distinct from BTS's earlier work."],
      ["Debut & early growth (2019–2020)", "The group debuted in March 2019 with \"The Dream Chapter: Star\" and lead single \"Crown,\" quickly becoming one of the fastest-growing rookie acts of its year on the back of HYBE's platform and fandom infrastructure. The \"Run Away\" trilogy era that followed built out the group's coming-of-age narrative arc across several album cycles."],
      ["International rise (2021–2023)", "\"The Chaos Chapter\" era and singles including \"0X1=LOVESONG (I Know I Love You)\" and \"Sweet Nightmare\" brought the group its first entries on the Billboard Hot 100 and 200. Touring scaled up accordingly, from the arena-level \"Act: Love Sick\" to the stadium-level \"Act: Promise\" world tour."],
      ["Today (2024–2026)", "With \"The Star Chapter\" era and subsequent releases, TXT has continued to grow its chart presence internationally while individual members have taken on acting, variety and solo content alongside group promotions."]
    ],
    members: [
      { name: "Soobin", real: "Choi Soobin", role: "Leader · Main Vocalist", color: "#A78BFA", bio: "The group's leader, Soobin is known for a calm, grounding presence both on stage and in the group's internal dynamic." },
      { name: "Yeonjun", real: "Choi Yeonjun", role: "Lead Rapper · Dancer", color: "#C4B5FD", bio: "The oldest member, Yeonjun trained for years before TXT's formation and is recognised for a strong fashion and visual presence." },
      { name: "Beomgyu", real: "Choi Beomgyu", role: "Vocalist · Rapper", color: "#A78BFA", bio: "Known for a bright, high-energy personality, Beomgyu plays guitar and contributes to the group's live instrumentation." },
      { name: "Taehyun", real: "Kang Taehyun", role: "Main Vocalist", color: "#C4B5FD", bio: "Regarded as a precise technical vocalist and dancer, Taehyun is frequently featured on the group's most demanding vocal parts." },
      { name: "Huening Kai", real: "Huening Kai", role: "Vocalist · Maknae", color: "#A78BFA", bio: "The youngest member, half-American and half-German, Huening Kai plays multiple instruments and is known for an openly expressive personality." }
    ],
    timeline: [
      ["2019", "Debut with \"Crown.\"", "normal"],
      ["2020", "\"Run Away\" trilogy era.", "normal"],
      ["2021", "First Billboard Hot 100 entry.", "normal"],
      ["2023", "\"Act: Promise\" stadium world tour.", "normal"],
      ["2025–26", "\"The Star Chapter\" era and continued growth.", "accent"]
    ]
  }
};

// --- CHIFFRES EN DIRECT (demande du 12/09/2026) ---
// Recalcule lieux/pays par groupe depuis window.STATIC_LOCATIONS au lieu des chiffres
// figés ci-dessus, à chaque chargement des deux pages. Fonctions pures, DOM mis à jour
// séparément par correctGroupNumbers() (qui suppose la même structure de page —
// .stat-num, [data-i18n="bpMeta"] etc. — sur artists.html et map-artists.html).
window.computeGroupLocationStats = function () {
    const stats = {};
    (window.STATIC_LOCATIONS || []).forEach(loc => {
        const key = (loc.group || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!key) return;
        if (!stats[key]) stats[key] = { count: 0, countries: new Set() };
        stats[key].count++;
        if (loc.country) stats[key].countries.add(loc.country);
    });
    return stats;
};

window.formatGroupMeta = function (memberCount, locCount, isFr) {
    if (isFr) {
        const membersPart = memberCount + ' membre' + (memberCount > 1 ? 's' : '');
        const locsPart = locCount === 0 ? 'aucun lieu pour le moment' : locCount + (locCount > 1 ? ' lieux cartographiés' : ' lieu cartographié');
        return membersPart + ' · ' + locsPart;
    }
    const membersPart = memberCount + ' member' + (memberCount > 1 ? 's' : '');
    const locsPart = locCount === 0 ? '0 locations mapped yet' : locCount + (locCount > 1 ? ' locations' : ' location') + ' mapped';
    return membersPart + ' · ' + locsPart;
};

window.ARTIST_ROW_META_TO_GROUP = { bpMeta: 'blackpink', twMeta: 'twice', svMeta: 'seventeen', keMeta: 'katseye', txMeta: 'txt' };

// Corrige en place window.GROUPS[lang][key].locations/countries puis met à jour le DOM
// (barre de stats, bloc "featured" BTS, lignes "Other groups") — même structure HTML
// sur artists.html et map-artists.html (voir les data-i18n bpMeta/twMeta/... et les 3
// .stat-num de .stats-bar), donc une seule implémentation suffit pour les deux pages.
window.correctGroupNumbers = function (currentLang) {
    const stats = window.computeGroupLocationStats();
    if (!Object.keys(stats).length) return; // locations-data.js pas encore chargé

    Object.keys(window.GROUPS).forEach(lang => {
        Object.keys(window.GROUPS[lang]).forEach(key => {
            const s = stats[key];
            if (s) {
                window.GROUPS[lang][key].locations = s.count;
                window.GROUPS[lang][key].countries = s.countries.size;
            }
        });
    });

    const isFr = currentLang === 'fr';

    // Bloc "featured" BTS.
    const bts = stats['bts'];
    if (bts) {
        const locsEl = document.querySelector('[data-i18n="btsLocs"]');
        if (locsEl) locsEl.textContent = bts.count + (isFr ? (bts.count > 1 ? ' lieux' : ' lieu') : (bts.count === 1 ? ' location' : ' locations'));
        const countriesEl = document.querySelector('[data-i18n="btsCountries"]');
        if (countriesEl && bts.countries.size) countriesEl.textContent = Array.from(bts.countries).join(', ');
    }

    // Lignes "Other groups".
    Object.keys(window.ARTIST_ROW_META_TO_GROUP).forEach(metaKey => {
        const groupKey = window.ARTIST_ROW_META_TO_GROUP[metaKey];
        const s = stats[groupKey];
        const memberCount = (window.GROUPS.en[groupKey] && window.GROUPS.en[groupKey].members || []).length;
        if (!memberCount) return;
        const el = document.querySelector(`[data-i18n="${metaKey}"]`);
        if (el) el.textContent = window.formatGroupMeta(memberCount, s ? s.count : 0, isFr);
    });

    // Total "Locations mapped" de la barre de stats du haut.
    const totalLocs = Object.values(stats).reduce((sum, s) => sum + s.count, 0);
    const statNums = document.querySelectorAll('.stat-num');
    if (statNums[2]) statNums[2].textContent = totalLocs;
};

// --- SURCHARGES ADMIN (photo/texte, demande du 13/09/2026) ---
// Voir window.getArtistOverrides() dans firebase-init.js et la collection
// artistOverrides dans firestore.rules. Une seule collection chargée une fois pour les
// 6 groupes, mise en cache pour la session — partagée par les deux pages puisqu'elles
// exécutent chacune leur propre copie de ce script (pas d'état partagé entre onglets).
let _artistOverridesCache = null;
window.loadArtistOverrides = async function () {
    if (!window.getArtistOverrides) return {}; // firebase-init.js pas encore chargé
    if (!_artistOverridesCache) _artistOverridesCache = await window.getArtistOverrides();
    return _artistOverridesCache;
};
window.clearArtistOverridesCache = function () { _artistOverridesCache = null; };
// Lecture synchrone du cache déjà chargé (par loadArtistOverrides) — utilisé par la
// modale d'édition admin de map-artists.html, qui s'ouvre toujours après que la fiche
// détaillée (donc les surcharges) ait déjà été chargée au moins une fois.
window.getArtistOverridesCache = function () { return _artistOverridesCache || {}; };
window.setArtistOverrideCacheEntry = function (key, fields) {
    if (!_artistOverridesCache) _artistOverridesCache = {};
    _artistOverridesCache[key] = Object.assign({}, _artistOverridesCache[key], fields);
};
// Seul BTS a un texte éditorial sur la page RÉSUMÉ (.featured-blurb) — les 5 autres
// groupes n'affichent leur texte que dans la fenêtre détaillée (renderArtistDetailHtml
// ci-dessous), donc rien à synchroniser ici pour eux.
window.applyArtistSummaryOverride = async function () {
    const ov = await window.loadArtistOverrides();
    const btsOv = ov.bts;
    if (btsOv && btsOv.text) {
        const el = document.querySelector('.featured-blurb');
        if (el) el.textContent = btsOv.text;
    }
};

// --- RENDU DE LA FICHE DÉTAILLÉE ---
// Construit le innerHTML de #detail-window pour un groupe donné. Appelée par
// openDetail(key) sur artists.html ET map-artists.html — c'est la seule copie de cette
// logique, ce qui garantit que les deux pages ne peuvent plus diverger.
// `t` : dictionnaire de traduction de la page appelante (t_artists[currentLang]), pour
// les libellés (Since/Members/At a glance/...) qui restent, eux, propres à chaque page.
// `overrides` : { photo, text } venant de loadArtistOverrides()[key], ou {}.
window.renderArtistDetailHtml = function (key, currentLang, t, overrides) {
    const g = (window.GROUPS[currentLang] || window.GROUPS.en)[key];
    const d = window.GROUP_DETAILS[key];
    const ov = overrides || {};
    const heroPhoto = ov.photo || g.photo;
    const introText = ov.text || g.blurb;

    const kpiHtml = `
        <div class="kpi-box"><div class="kpi-label">Agency</div><div class="kpi-value">${d.agency}</div></div>
        <div class="kpi-box"><div class="kpi-label">Fandom</div><div class="kpi-value">${d.fandom}</div></div>
        <div class="kpi-box"><div class="kpi-label">Members</div><div class="kpi-value">${d.members.length}</div></div>
        <div class="kpi-box"><div class="kpi-label">Debut</div><div class="kpi-value">${d.debut}</div></div>
    `;

    const sectionsHtml = d.sections.map(([heading, ...paras]) => `
        <div class="blog-heading">${heading}</div>
        ${paras.map(p => `<p class="para">${p}</p>`).join('')}
        <hr class="section-sep">
    `).join('');

    const membersHtml = d.members.map(m => `
        <div class="member-card">
          <div class="member-avatar" style="background:${m.color};">${m.name.slice(0,2).toUpperCase()}</div>
          <div class="member-info">
            <div class="m-name">${m.name} <span class="real-name">(${m.real})</span></div>
            <div class="m-role">${m.role}</div>
            <div class="m-bio">${m.bio}</div>
          </div>
        </div>
    `).join('');

    const timelineHtml = d.timeline.map(([year, text, tone]) => {
        const cls = tone === 'muted' ? ' tl-dot-muted' : tone === 'accent' ? ' tl-dot-accent' : '';
        const yearCls = tone === 'muted' ? ' tl-year-muted' : tone === 'accent' ? ' tl-year-accent' : '';
        return `<div class="tl-item"><div class="tl-dot${cls}"></div><div class="tl-year${yearCls}">${year}</div><div class="tl-text">${text}</div></div>`;
    }).join('');

    // Crayon d'édition admin : rendu caché par défaut sur les DEUX pages. Son onclick
    // vérifie que la modale (#dest-edit-overlay) et openArtistEditModal() existent
    // avant de les utiliser, pour ne rien casser sur une page qui n'a pas cette modale
    // (artists.html, page publique — voir la note en tête de fichier) ; sa visibilité
    // réelle est décidée après coup par l'appelant via window.isCurrentUserAdmin().
    return `
        <div class="detail-hero" style="background-image: url('${heroPhoto}');">
          <div class="detail-hero-overlay"></div>
          <button type="button" class="detail-edit-pencil hidden" id="artist-edit-pencil" title="Edit photo/text (admin)" onclick="event.stopPropagation(); if (document.getElementById('dest-edit-overlay') && typeof openArtistEditModal === 'function') openArtistEditModal('${key}');">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
          </button>
          <div class="detail-close" onclick="closeDetail()">✕</div>
          <div class="detail-tag">${t.since} ${g.since}</div>
          <div class="detail-name">${g.name}</div>
        </div>
        ${introText ? `<p class="detail-intro">${introText}</p>` : ''}
        <div class="detail-body">
          <div class="kpi-grid">${kpiHtml}</div>

          ${sectionsHtml}

          <div class="detail-section-label">${t.detailMembers} (${d.members.length})</div>
          ${membersHtml}

          <hr class="section-sep">

          <div class="detail-section-label">Timeline</div>
          <div class="timeline-wrap">${timelineHtml}</div>

          <hr class="section-sep">

          <div class="detail-section-label">${t.detailGlance}</div>
          <div class="map-stats">
            <div class="map-stat"><div class="n">${g.locations}</div><div class="l">${t.statLocs}</div></div>
            <div class="map-stat"><div class="n">${g.countries}</div><div class="l">${t.statCountries}</div></div>
          </div>
          ${g.locations > 0 ? `<p class="para" style="margin-top:14px;"><b>${t.detailCats}:</b> ${g.categories}</p>` : ''}
        </div>
    `;
};
