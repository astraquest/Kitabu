import argparse
import json
import re
import textwrap
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[4]
BOOK_ROOT = REPO_ROOT / "apps/api/data/books"
CURRICULUM_MARKDOWN_ROOT = REPO_ROOT / "apps/api/data/curriculum/markdown"
COVER_IMAGE_RELATIVE = "apps/api/data/books/assets/kitabu-quest-upper-primary-cover-illustration.png"
COVER_IMAGE_PATH = REPO_ROOT / COVER_IMAGE_RELATIVE

SOURCE_PAGES = {
    "4": "https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-four-designs/",
    "5": "https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-five-designs/",
    "6": "https://kicd.ac.ke/cbc-materials/curriculum-designs/grade-six-designs/",
}

DRIVE_IDS = {
    "4": {
        "mathematics": "1o5tDq16yC0Jj1h6zb9mo3dsxtjqXUk4G",
        "english": "1o3j3bJwiqJyerdZIFPDJaSprYdTp3Eu1",
        "kiswahili": "1MO1ddc7tFvcpKYy7Trr4VBhllBmwKntW",
        "science-and-technology": "1jbAvVAWmif-toAfPShQm9UujN7bZ0luX",
        "social-studies": "1I81sEkJJz7zj2rp4thpUN3MOlHPK5-mG",
    },
    "5": {
        "mathematics": "1ShOUex4qEQosDCvkKdaXIRvteOILPHTP",
        "english": "1ctDo-PB4W6AKbKV0Lb-1OobOC2-L3_e_",
        "kiswahili": "1aGnwbMdfKkwTBtVOcliEiyge6qAHpHhd",
        "science-and-technology": "1CituzlfluxqVvjExx7xHiV_j_ZDXwpja",
        "social-studies": "1uOCVkljUKcfMkRs1gwAbDZMj_p9cjbut",
    },
    "6": {
        "mathematics": "1ki1N1YnslIpZomG-0IoYogkzek7CKx0j",
        "english": "1QR9nW3baakrHLIIpv-9UfQyMbOoDTcDX",
        "kiswahili": "1p4DSwvmGPzn3ZHCZhRTN88Zvju3XtgYf",
        "science-and-technology": "1Cqoxx-afRo1d3DdjdCY8l5STD1lXJhJI",
        "social-studies": "1H1QZ6wgFPsEL6S4A7dFdjukr2jEG8sS2",
    },
}

UPPER_PRIMARY_SUBJECTS = [
    {
        "slug": "mathematics",
        "subject_id": "mathematics",
        "subject": "Mathematics",
        "color": "#1D4ED8",
        "chapters": [
            {
                "title": "Whole Numbers and Place Value",
                "focus": "reading, writing, comparing, ordering, and using numbers in real situations",
                "lessons": [
                    "Reading and Writing Numbers",
                    "Place Value and Expanded Form",
                    "Comparing and Ordering Numbers",
                ],
                "example": "The number 4,736 has 4 thousands, 7 hundreds, 3 tens, and 6 ones.",
                "activity": "Use bottle tops, beans, or stones to build numbers in groups of thousands, hundreds, tens, and ones.",
                "practice": [
                    "Write 8,205 in words.",
                    "Write 6,000 + 400 + 20 + 9 as one number.",
                    "Arrange 3,415, 3,451, 3,154, and 3,514 from smallest to largest.",
                ],
            },
            {
                "title": "Operations with Whole Numbers",
                "focus": "addition, subtraction, multiplication, division, and estimation",
                "lessons": [
                    "Addition and Subtraction Strategies",
                    "Multiplication as Groups and Arrays",
                    "Division as Sharing and Grouping",
                ],
                "example": "If 6 groups each have 24 seedlings, then 6 x 24 = 144 seedlings.",
                "activity": "Create a class shop. Learners buy two or three items, estimate the total, and then calculate the exact change.",
                "practice": [
                    "A school has 248 exercise books. It receives 376 more. How many books are there now?",
                    "A farmer packs 156 mangoes into boxes of 12. How many full boxes can be packed?",
                    "Estimate 489 + 312 by rounding to the nearest hundred.",
                ],
            },
            {
                "title": "Fractions",
                "focus": "equal parts, equivalent fractions, comparing fractions, and fractions of quantities",
                "lessons": [
                    "Fractions as Equal Parts",
                    "Equivalent Fractions",
                    "Fractions of a Set",
                ],
                "example": "One half of 18 oranges is 9 oranges because 18 divided by 2 equals 9.",
                "activity": "Fold paper strips into halves, quarters, and eighths. Label each part and compare the sizes.",
                "practice": [
                    "Draw a rectangle and shade 3/4 of it.",
                    "Find 1/3 of 24.",
                    "Which is larger: 2/5 or 3/5? Explain.",
                ],
            },
            {
                "title": "Measurement",
                "focus": "length, mass, capacity, time, money, perimeter, and area",
                "lessons": [
                    "Measuring Length, Mass, and Capacity",
                    "Time and Timetables",
                    "Perimeter and Area",
                ],
                "example": "A rectangle with length 8 cm and width 5 cm has perimeter 26 cm and area 40 square cm.",
                "activity": "Measure classroom objects, record the measurements, then arrange them from shortest to longest.",
                "practice": [
                    "Convert 3 metres to centimetres.",
                    "A lesson starts at 10:15 a.m. and ends at 11:00 a.m. How long is it?",
                    "Find the perimeter of a square whose side is 7 cm.",
                ],
            },
            {
                "title": "Geometry and Data",
                "focus": "shapes, angles, position, patterns, tables, pictographs, and bar graphs",
                "lessons": [
                    "Lines, Angles, and Shapes",
                    "Patterns and Position",
                    "Collecting and Displaying Data",
                ],
                "example": "A bar graph can show how many learners chose football, netball, athletics, or swimming.",
                "activity": "Survey favourite fruits in class and draw a bar graph from the results.",
                "practice": [
                    "Name three objects shaped like a cuboid.",
                    "Continue the pattern: 4, 8, 12, 16, __, __.",
                    "Write two questions you can answer from a class bar graph.",
                ],
            },
        ],
    },
    {
        "slug": "english",
        "subject_id": "english",
        "subject": "English",
        "color": "#7C3AED",
        "chapters": [
            {
                "title": "Listening and Speaking",
                "focus": "clear speech, active listening, turn-taking, questions, and oral presentation",
                "lessons": ["Listening for Main Ideas", "Asking and Answering Questions", "Speaking Clearly"],
                "example": "A good listener faces the speaker, avoids interrupting, and asks a relevant question.",
                "activity": "In pairs, one learner explains how to plant a seedling while the other retells the steps.",
                "practice": [
                    "List three signs of active listening.",
                    "Prepare three questions you would ask a visitor to your school.",
                    "Tell a one-minute story with a clear beginning, middle, and ending.",
                ],
            },
            {
                "title": "Reading Fluency and Comprehension",
                "focus": "reading accurately, using context clues, identifying main ideas, and making inferences",
                "lessons": ["Reading with Expression", "Main Idea and Details", "Inference and Prediction"],
                "example": "If a passage says clouds gathered and pupils ran inside, we can infer that rain was likely.",
                "activity": "Read a short story aloud, then mark sentences that show the problem and solution.",
                "practice": [
                    "Write the main idea of a paragraph you read today.",
                    "Find two details that support the main idea.",
                    "Predict what may happen next and give evidence.",
                ],
            },
            {
                "title": "Vocabulary and Word Study",
                "focus": "new words, prefixes, suffixes, synonyms, antonyms, and dictionary skills",
                "lessons": ["Using Context Clues", "Synonyms and Antonyms", "Dictionary Skills"],
                "example": "In 'The road was narrow, not wide', the words narrow and wide are antonyms.",
                "activity": "Create a vocabulary wall with word, meaning, sentence, synonym, and drawing.",
                "practice": [
                    "Find a synonym for happy.",
                    "Find an antonym for early.",
                    "Use a dictionary to find the meaning of harvest.",
                ],
            },
            {
                "title": "Grammar and Sentences",
                "focus": "nouns, verbs, adjectives, tense, punctuation, and complete sentences",
                "lessons": ["Parts of Speech", "Present, Past, and Future Tense", "Punctuation"],
                "example": "The sentence 'Amina planted beans yesterday.' uses past tense.",
                "activity": "Sort word cards into nouns, verbs, adjectives, and adverbs, then build sentences.",
                "practice": [
                    "Underline the verb: The boys carried water.",
                    "Change this to past tense: We walk to school.",
                    "Add correct punctuation: where is your book",
                ],
            },
            {
                "title": "Writing",
                "focus": "planning, paragraphing, descriptions, letters, summaries, and editing",
                "lessons": ["Planning Before Writing", "Paragraphs and Descriptions", "Editing and Publishing"],
                "example": "A strong paragraph has one main idea, supporting sentences, and a closing sentence.",
                "activity": "Write a paragraph describing your classroom, then exchange books for peer editing.",
                "practice": [
                    "Write a topic sentence about your favourite game.",
                    "Add three supporting details.",
                    "Edit your work for capital letters, full stops, and spelling.",
                ],
            },
        ],
    },
    {
        "slug": "kiswahili",
        "subject_id": "kiswahili",
        "subject": "Kiswahili",
        "color": "#C2410C",
        "chapters": [
            {
                "title": "Kusikiliza na Kuzungumza",
                "focus": "kusikiliza kwa makini, kujibu maswali, matamshi sahihi, na mazungumzo ya heshima",
                "lessons": ["Kusikiliza Maagizo", "Kuuliza na Kujibu Maswali", "Kutamka Maneno Wazi"],
                "example": "Mwanafunzi anaposikiliza maagizo, anapaswa kutaja hatua muhimu kwa mpangilio.",
                "activity": "Fanyeni mazungumzo ya dukani. Mmoja awe muuzaji na mwingine awe mnunuzi.",
                "practice": [
                    "Taja mambo matatu ya msikilizaji mzuri.",
                    "Andika maswali mawili utakayomuuliza mgeni shuleni.",
                    "Simulia tukio la asubuhi kwa sentensi tano.",
                ],
            },
            {
                "title": "Kusoma na Ufahamu",
                "focus": "kusoma kwa ufasaha, kutambua wazo kuu, maelezo muhimu, na maana kutokana na muktadha",
                "lessons": ["Kusoma kwa Ufasaha", "Wazo Kuu", "Maswali ya Ufahamu"],
                "example": "Ukisoma kifungu kuhusu mvua na mazao, wazo kuu linaweza kuwa umuhimu wa mvua kwa kilimo.",
                "activity": "Someni hadithi fupi kisha mpange matukio yake kuanzia mwanzo hadi mwisho.",
                "practice": [
                    "Taja wazo kuu la kifungu ulichosoma.",
                    "Andika maelezo mawili yanayounga mkono wazo kuu.",
                    "Eleza maana ya neno jipya kwa kutumia muktadha.",
                ],
            },
            {
                "title": "Msamiati",
                "focus": "maneno mapya, visawe, vinyume, methali rahisi, na matumizi ya kamusi",
                "lessons": ["Maneno Mapya", "Visawe na Vinyume", "Kamusi"],
                "example": "Kisawe cha 'furaha' ni 'shangwe'. Kinyume cha 'kubwa' ni 'ndogo'.",
                "activity": "Tengenezeni ukuta wa msamiati wenye neno, maana, sentensi, na mchoro.",
                "practice": [
                    "Andika kisawe cha haraka.",
                    "Andika kinyume cha safi.",
                    "Tumia neno jamii katika sentensi.",
                ],
            },
            {
                "title": "Sarufi",
                "focus": "nomino, vitenzi, vivumishi, nyakati, upatanisho wa kisarufi, na alama za uakifishaji",
                "lessons": ["Nomino na Vitenzi", "Vivumishi", "Nyakati"],
                "example": "Katika sentensi 'Mtoto mzuri anasoma', mtoto ni nomino na anasoma ni kitenzi.",
                "activity": "Pangeni kadi za maneno katika makundi ya nomino, vitenzi, na vivumishi.",
                "practice": [
                    "Tambua kitenzi: Mkulima analima shamba.",
                    "Badilisha sentensi hii iwe wakati uliopita: Mimi ninasoma.",
                    "Ongeza alama sahihi: jina lako ni nani",
                ],
            },
            {
                "title": "Kuandika",
                "focus": "sentensi, aya, insha fupi, barua rahisi, muhtasari, na kuhariri kazi",
                "lessons": ["Sentensi Kamili", "Aya Nzuri", "Kuhariri Kazi"],
                "example": "Aya nzuri huwa na wazo kuu, sentensi za maelezo, na sentensi ya kumalizia.",
                "activity": "Andika aya kuhusu shule yako, kisha ibadilishe na mwenzako kwa marekebisho.",
                "practice": [
                    "Andika sentensi tatu kuhusu familia yako.",
                    "Andika aya moja kuhusu mchezo unaoupenda.",
                    "Sahihisha herufi kubwa na nukta katika kazi yako.",
                ],
            },
        ],
    },
    {
        "slug": "science-and-technology",
        "subject_id": "science",
        "subject": "Science & Technology",
        "color": "#047857",
        "chapters": [
            {
                "title": "Living Things",
                "focus": "plants, animals, habitats, life processes, and care for the environment",
                "lessons": ["Characteristics of Living Things", "Plants and Their Parts", "Animals and Habitats"],
                "example": "Living things grow, feed, breathe, respond to changes, and reproduce.",
                "activity": "Observe plants around school and record leaf shape, stem type, and where each plant grows.",
                "practice": [
                    "Name three characteristics of living things.",
                    "Draw and label the main parts of a plant.",
                    "Explain why animals need suitable habitats.",
                ],
            },
            {
                "title": "The Human Body and Health",
                "focus": "body parts, hygiene, nutrition, common diseases, safety, and first aid",
                "lessons": ["Body Systems in Daily Life", "Food and Nutrition", "Hygiene and Safety"],
                "example": "Balanced meals include body-building foods, energy-giving foods, protective foods, and water.",
                "activity": "Create a one-day healthy meal plan using foods found in your community.",
                "practice": [
                    "List two ways to prevent the spread of germs.",
                    "Give one example of a protective food.",
                    "Write one safety rule for using sharp tools.",
                ],
            },
            {
                "title": "Matter and Materials",
                "focus": "solids, liquids, gases, properties of materials, and simple changes",
                "lessons": ["States of Matter", "Properties of Materials", "Mixtures and Separation"],
                "example": "Water can be a solid as ice, a liquid as drinking water, and a gas as steam.",
                "activity": "Sort classroom materials by hardness, flexibility, transparency, and ability to absorb water.",
                "practice": [
                    "Name one solid, one liquid, and one gas.",
                    "Why is metal useful for making cooking pots?",
                    "How can sand be separated from water?",
                ],
            },
            {
                "title": "Energy, Forces, and Simple Technology",
                "focus": "light, heat, sound, electricity, pushes, pulls, machines, and responsible technology use",
                "lessons": ["Sources of Energy", "Forces Around Us", "Useful Technology"],
                "example": "A push can move a door open, while a pull can close a drawer.",
                "activity": "Build a simple ramp and test how surface texture affects movement.",
                "practice": [
                    "Name two sources of light.",
                    "Give one example of a push and one example of a pull.",
                    "Write one rule for safe use of electrical devices.",
                ],
            },
            {
                "title": "Earth, Weather, and Conservation",
                "focus": "weather, soil, water, pollution, conservation, and responsible use of resources",
                "lessons": ["Weather Observation", "Soil and Water", "Conserving the Environment"],
                "example": "Weather records help farmers, travellers, and schools plan daily activities.",
                "activity": "Keep a seven-day weather chart showing cloud cover, rainfall, wind, and temperature.",
                "practice": [
                    "Name three types of weather conditions.",
                    "Give two causes of soil erosion.",
                    "Suggest one way learners can conserve water at school.",
                ],
            },
        ],
    },
    {
        "slug": "social-studies",
        "subject_id": "social_studies",
        "subject": "Social Studies",
        "color": "#BE123C",
        "chapters": [
            {
                "title": "Family, School, and Community",
                "focus": "roles, responsibilities, cooperation, respect, and problem solving",
                "lessons": ["Family Members and Roles", "School Community", "Community Helpers"],
                "example": "A community works well when people perform their roles responsibly and respect one another.",
                "activity": "Interview an adult about one community service and present what you learned.",
                "practice": [
                    "List three responsibilities of a learner at school.",
                    "Name two community helpers.",
                    "Explain one way people can solve disagreements peacefully.",
                ],
            },
            {
                "title": "Kenya and Its Counties",
                "focus": "location, counties, county resources, towns, and national identity",
                "lessons": ["Locating Kenya", "Counties and County Headquarters", "National Symbols"],
                "example": "Kenya has counties that help bring services closer to communities.",
                "activity": "Use a map to locate your county, neighbouring counties, and one major town.",
                "practice": [
                    "Name your county.",
                    "Write one national symbol of Kenya.",
                    "Why are counties important?",
                ],
            },
            {
                "title": "Map Skills",
                "focus": "directions, symbols, keys, simple scales, sketches, and reading maps",
                "lessons": ["Cardinal Directions", "Map Symbols and Keys", "Drawing Simple Maps"],
                "example": "A map key explains what symbols such as roads, rivers, schools, and hospitals mean.",
                "activity": "Draw a simple map from your classroom to the school gate using symbols and a key.",
                "practice": [
                    "Name the four cardinal directions.",
                    "What is the work of a map key?",
                    "Draw a symbol for a river and a road.",
                ],
            },
            {
                "title": "Resources and Economic Activities",
                "focus": "natural resources, farming, fishing, trade, transport, tourism, and conservation",
                "lessons": ["Natural Resources", "Economic Activities", "Conserving Resources"],
                "example": "Tea farming is common in cool, wet highland areas, while fishing is important near lakes and the coast.",
                "activity": "Make a table of three resources in your county and how people use them.",
                "practice": [
                    "Name two natural resources found in Kenya.",
                    "Give one economic activity in your community.",
                    "Why should resources be conserved?",
                ],
            },
            {
                "title": "Citizenship, Leadership, and Culture",
                "focus": "rights, responsibilities, leaders, rules, values, culture, and national unity",
                "lessons": ["Rights and Responsibilities", "Good Leadership", "Culture and Unity"],
                "example": "Good leaders listen, serve fairly, keep promises, and help people work together.",
                "activity": "Create a class charter with rights, responsibilities, and agreed class values.",
                "practice": [
                    "Write one right and one responsibility of a child.",
                    "List two qualities of a good leader.",
                    "Explain how culture can promote unity.",
                ],
            },
        ],
    },
]


def slugify(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_font(size, bold=False):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def wrap_text(draw, text, font, max_width):
    lines = []
    for paragraph in text.splitlines():
        if not paragraph.strip():
            lines.append("")
            continue
        words = paragraph.split()
        current = ""
        for word in words:
            attempt = f"{current} {word}".strip()
            width = draw.textbbox((0, 0), attempt, font=font)[2]
            if width <= max_width or not current:
                current = attempt
            else:
                lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def render_pdf(book, pdf_path):
    page_size = (1240, 1754)
    margin = 92
    title_font = load_font(44, bold=True)
    h1_font = load_font(34, bold=True)
    body_font = load_font(25)
    small_font = load_font(18)
    pages = []

    def new_page(bg="#FFFFFF"):
        image = Image.new("RGB", page_size, bg)
        return image, ImageDraw.Draw(image), margin

    def flush_page(image):
        pages.append(image)

    if COVER_IMAGE_PATH.exists():
        cover_art = Image.open(COVER_IMAGE_PATH).convert("RGB")
        cover_art.thumbnail((page_size[0], page_size[1]))
        cover = Image.new("RGB", page_size, book["color"])
        x = (page_size[0] - cover_art.width) // 2
        y_art = (page_size[1] - cover_art.height) // 2
        cover.paste(cover_art, (x, y_art))
        overlay = Image.new("RGBA", page_size, (0, 0, 0, 82))
        cover = Image.alpha_composite(cover.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(cover)
    else:
        cover, draw, y = new_page(book["color"])
    draw.rectangle((48, 48, page_size[0] - 48, page_size[1] - 48), outline="#FFFFFF", width=5)
    draw.text((margin, 220), "KITABU QUEST", fill="#FFFFFF", font=title_font)
    y = 320
    for line in wrap_text(draw, f"{book['gradeLevel']} {book['subject']}", title_font, page_size[0] - 2 * margin):
        draw.text((margin, y), line, fill="#FFFFFF", font=title_font)
        y += 58
    draw.text((margin, y + 40), "CBC-aligned learning book", fill="#F8FAFC", font=h1_font)
    draw.text((margin, page_size[1] - 190), "Astra Quest AI / Kitabu AI", fill="#F8FAFC", font=small_font)
    flush_page(cover)

    current, draw, y = new_page()
    draw.text((margin, y), book["title"], fill="#111827", font=h1_font)
    y += 58
    for page in book["pages"]:
        heading = page["title"]
        content = page["content"]
        block_lines = [f"# {heading}", *content.splitlines()]
        for raw_line in block_lines:
            font = h1_font if raw_line.startswith("# ") else body_font
            text = raw_line[2:] if raw_line.startswith("# ") else raw_line
            if y > page_size[1] - 150:
                flush_page(current)
                current, draw, y = new_page()
            if not text.strip():
                y += 20
                continue
            for line in wrap_text(draw, text, font, page_size[0] - 2 * margin):
                if y > page_size[1] - 120:
                    flush_page(current)
                    current, draw, y = new_page()
                draw.text((margin, y), line, fill="#111827", font=font)
                y += 42 if font == body_font else 52
            y += 8
    flush_page(current)

    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    pages[0].save(pdf_path, "PDF", resolution=150.0, save_all=True, append_images=pages[1:])


def paragraph(*parts):
    return "\n\n".join(part.strip() for part in parts if part.strip())


def source_page_for_grade(grade):
    return SOURCE_PAGES[str(grade)]


def drive_id_for_subject(subject, grade):
    return DRIVE_IDS[str(grade)][subject["slug"]]


def build_intro(subject, grade):
    return {
        "title": "How to Use This Book",
        "content": paragraph(
            f"This KITABU QUEST book is built for Grade {grade} learners studying {subject['subject']}. It turns curriculum goals into clear lessons, examples, activities, and practice tasks that can be used at home, in class, or inside the Kitabu AI app.",
            "Each chapter starts with what you will learn, then gives guided explanations, a worked example, a practical activity, and questions for checking understanding. Learners should read actively, write answers in an exercise book, and ask for help whenever a step is unclear.",
            f"The official KICD Grade {grade} curriculum design page is recorded as the source reference for this subject. At generation time, the public Google Drive previews were visible but direct PDF download was blocked, so this book uses the accessible subject listing plus Kitabu's local upper-primary subject structure and teacher-ready practice design. Replace or enrich this book after full official source markdown becomes locally available.",
        ),
    }


def build_chapter_page(subject, index, chapter):
    lesson_lines = "\n".join(f"- {lesson}" for lesson in chapter["lessons"])
    return {
        "title": f"Chapter {index}: {chapter['title']}",
        "content": paragraph(
            f"Learning focus: {chapter['focus']}.",
            "Key lessons:\n" + lesson_lines,
            f"Teacher explanation: In this chapter, learners connect {chapter['focus']} to familiar Grade {subject.get('grade', 'upper-primary')} situations. Start with concrete objects, pictures, oral examples, or local experiences. Move slowly from what learners can observe to what they can explain, record, and apply independently.",
            "Success signs: By the end of this chapter, a learner should explain the main idea in simple words, solve or complete a related task, and use the idea in a home, school, or community example.",
            "Learning routine: Read the lesson goal, study the guided example, try the activity with available materials, answer the practice questions, then correct mistakes before moving on.",
        ),
    }


def build_lesson_page(subject, chapter_index, lesson_index, chapter, lesson):
    practice_lines = "\n".join(f"{i + 1}. {item}" for i, item in enumerate(chapter["practice"]))
    return {
        "title": f"Lesson {chapter_index}.{lesson_index}: {lesson}",
        "content": paragraph(
            f"Goal: Learn {lesson.lower()} as part of {chapter['title'].lower()}.",
            f"Learn: {chapter['focus'].capitalize()} becomes easier when you connect the idea to real examples. Read the words carefully, say the main idea aloud, and write one example in your exercise book. If the idea involves numbers, objects, or a process, show every step rather than jumping straight to the answer.",
            f"Guided example: {chapter['example']}",
            f"Try it practically: {chapter['activity']}",
            "Class talk: Work with a partner. One learner explains the example while the other asks a why or how question. Change roles and improve the explanation.",
            "Practice:\n" + practice_lines,
            "Self-check: Did you show your working or give a clear reason? Did you use correct vocabulary? Did your answer match the question asked?",
            "Home link: Teach this lesson to someone at home using a familiar object, local place, household task, or community example.",
        ),
    }


def build_revision_page(subject):
    chapter_titles = [chapter["title"] for chapter in subject["chapters"]]
    checklist = "\n".join(f"- I can explain and practise {title.lower()}." for title in chapter_titles)
    mixed = "\n".join(
        f"{i + 1}. Choose one idea from {title} and write a real-life example from your home, school, or community."
        for i, title in enumerate(chapter_titles)
    )
    return {
        "title": "End of Book Revision",
        "content": paragraph(
            "Use this section after completing all chapters. Do not rush. Read your notes again, redo questions you missed, and explain your answers aloud.",
            "Mastery checklist:\n" + checklist,
            "Mixed practice:\n" + mixed,
            f"Project: Create a one-page poster that teaches another Grade {subject.get('grade', 'upper-primary')} learner one important idea from this book. Include a title, a clear explanation, an example, and three practice questions.",
        ),
    }


def build_book(subject, grade, generated_at):
    title = f"KITABU QUEST Grade {grade} {subject['subject']}"
    subject_for_pages = {**subject, "grade": grade}
    pages = [build_intro(subject_for_pages, grade)]
    for index, chapter in enumerate(subject["chapters"], start=1):
        pages.append(build_chapter_page(subject_for_pages, index, chapter))
        for lesson_index, lesson in enumerate(chapter["lessons"], start=1):
            pages.append(build_lesson_page(subject_for_pages, index, lesson_index, chapter, lesson))
    pages.append(build_revision_page(subject_for_pages))
    return {
        "id": f"kitabu-quest-grade-{grade}-{subject['slug']}",
        "title": title,
        "brand": "KITABU QUEST",
        "gradeLevel": f"Grade {grade}",
        "countryCode": "KEN",
        "curriculumCode": "CBC",
        "subjectId": subject["subject_id"],
        "subject": subject["subject"],
        "author": "Kitabu AI Learning Studio",
        "color": subject["color"],
        "coverImage": COVER_IMAGE_RELATIVE if COVER_IMAGE_PATH.exists() else None,
        "generatedAt": generated_at,
        "source": {
            "status": "official-preview-listed-download-blocked",
            "officialPage": source_page_for_grade(grade),
            "googleDrivePreviewId": drive_id_for_subject(subject, grade),
            "notes": f"KICD Grade {grade} page lists this subject and embeds the Drive preview. Direct PDF download returned HTML instead of a valid PDF during generation.",
        },
        "pages": pages,
    }


def markdown_for_book(book):
    source = book["source"]
    frontmatter = {
        "title": book["title"],
        "brand": book["brand"],
        "grade_level": book["gradeLevel"],
        "country_code": book["countryCode"],
        "curriculum_code": book["curriculumCode"],
        "subject_id": book["subjectId"],
        "subject": book["subject"],
        "author": book["author"],
        "cover_image": book["coverImage"],
        "generated_at": book["generatedAt"],
        "source_status": source["status"],
        "source_page": source["officialPage"],
        "source_drive_id": source["googleDrivePreviewId"],
    }
    lines = ["---", *[f"{key}: {json.dumps(value)}" for key, value in frontmatter.items()], "---", ""]
    lines.append(f"# {book['title']}")
    lines.append("")
    lines.append("> Generated for Kitabu AI. Review before classroom publication.")
    lines.append("")
    for page in book["pages"]:
        lines.append(f"## {page['title']}")
        lines.append("")
        lines.append(page["content"])
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def write_source_status(subject, grade, generated_at):
    target = CURRICULUM_MARKDOWN_ROOT / "KEN/CBC" / f"G{grade}" / subject["slug"] / "source-status.md"
    target.parent.mkdir(parents=True, exist_ok=True)
    content = textwrap.dedent(
        f"""\
        ---
        country_code: "KEN"
        curriculum_code: "CBC"
        grade_code: "G{grade}"
        subject: "{subject['subject']}"
        generated_at: "{generated_at}"
        source_status: "official-preview-listed-download-blocked"
        source_page: "{source_page_for_grade(grade)}"
        source_drive_id: "{drive_id_for_subject(subject, grade)}"
        ---

        # Grade {grade} {subject['subject']} Source Status

        The KICD Grade {grade} curriculum designs page lists this subject and embeds a Google Drive preview.

        Direct PDF download was attempted, but Google Drive returned HTML instead of a valid PDF. This file records the source reference and prevents invalid HTML downloads from being treated as curriculum markdown.

        Generated KITABU QUEST books for this subject are stored under:

        `apps/api/data/books/KEN/CBC/G{grade}/{subject['slug']}/`
        """
    )
    target.write_text(content, encoding="utf-8")
    return target


def generate(grade):
    generated_at = now_iso()
    outputs = []
    for subject in UPPER_PRIMARY_SUBJECTS:
        book = build_book(subject, grade, generated_at)
        subject_dir = BOOK_ROOT / "KEN/CBC" / f"G{grade}" / subject["slug"]
        subject_dir.mkdir(parents=True, exist_ok=True)
        base = subject_dir / book["id"]

        md_path = base.with_suffix(".md")
        json_path = base.with_suffix(".pages.json")
        pdf_path = base.with_suffix(".pdf")

        md_path.write_text(markdown_for_book(book), encoding="utf-8")
        json_path.write_text(json.dumps(book, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        render_pdf(book, pdf_path)
        status_path = write_source_status(subject, grade, generated_at)

        outputs.append(
            {
                "subject": subject["subject"],
                "markdown": str(md_path.relative_to(REPO_ROOT)).replace("\\", "/"),
                "pagesJson": str(json_path.relative_to(REPO_ROOT)).replace("\\", "/"),
                "pdf": str(pdf_path.relative_to(REPO_ROOT)).replace("\\", "/"),
                "sourceStatus": str(status_path.relative_to(REPO_ROOT)).replace("\\", "/"),
            }
        )
    return outputs


def main():
    parser = argparse.ArgumentParser(description="Generate KITABU QUEST curriculum books.")
    parser.add_argument("--grade", default="4", choices=["4", "5", "6"], help="Upper primary grade to generate.")
    args = parser.parse_args()
    outputs = generate(args.grade)
    print(json.dumps({"generated": outputs}, indent=2))


if __name__ == "__main__":
    main()
