import os
from fpdf import FPDF
import textwrap
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Constants ---
PDF_WIDTH = 210
MARGIN = 10
PRINTABLE_WIDTH = PDF_WIDTH - (2 * MARGIN)  # 190mm
FONT_FAMILY = "Arial"

def sanitize_text(text, max_word_length=25):
    """
    Aggressively cleans text to prevent FPDF crashes.
    1. Removes Emojis (FPDF cannot handle them).
    2. Wraps long words (URLs/Hash strings).
    3. Encodes to Latin-1.
    """
    if text is None:
        return ""
    if not isinstance(text, str):
        text = str(text)
    
    # 1. Strip Emojis and complex Unicode characters
    # This encodes to ASCII and ignores errors (dropping emojis), then decodes back.
    # This is the most effective way to prevent FPDF crashes.
    text = text.encode('ascii', 'ignore').decode('ascii')
    
    # 2. Replace common problematic punctuation
    replacements = { '•': '*', '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-' }
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    # 3. Force-break extremely long words (like URLs)
    words = text.split(' ')
    processed_words = []
    for word in words:
        if len(word) > max_word_length:
            chunks = textwrap.wrap(word, max_word_length, break_long_words=True, break_on_hyphens=False)
            processed_words.extend(chunks)
        else:
            processed_words.append(word)
    
    text = ' '.join(processed_words)
    
    # 4. Final encoding safety check
    return text.encode('latin-1', 'replace').decode('latin-1')

class PDF(FPDF):
    def header(self):
        self.set_font(FONT_FAMILY, 'B', 16)
        self.cell(0, 10, 'Interview Performance Report', border=False, ln=True, align='C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font(FONT_FAMILY, 'I', 8)
        self.set_text_color(128)
        self.cell(0, 10, f'Page {self.page_no()}', border=False, align='C')

    def chapter_title(self, title):
        self.set_font(FONT_FAMILY, 'B', 14)
        self.set_fill_color(240, 240, 240)
        self.cell(0, 10, sanitize_text(title), ln=True, border='B', fill=True)
        self.ln(5)

def create_feedback_pdf(session_id, transcript, feedback_data):
    try:
        reports_dir = 'reports'
        if not os.path.exists(reports_dir):
            os.makedirs(reports_dir)
        
        filepath = os.path.join(reports_dir, f'feedback_report_{session_id}.pdf')

        pdf = PDF('P', 'mm', 'A4')
        pdf.set_margins(MARGIN, MARGIN, MARGIN)
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)
        
        # --- Overall Summary ---
        pdf.chapter_title("Overall Performance Summary")
        summary = feedback_data.get("overall_summary", {})
        
        pdf.set_font(FONT_FAMILY, 'B', 11)
        pdf.cell(0, 8, "Strengths:", ln=True)
        pdf.set_font(FONT_FAMILY, '', 10)
        for item in summary.get("strengths", []):
            pdf.set_x(MARGIN) 
            pdf.multi_cell(PRINTABLE_WIDTH, 6, sanitize_text(f"  * {item}"))
        pdf.ln(4)

        pdf.set_font(FONT_FAMILY, 'B', 11)
        pdf.cell(0, 8, "Areas for Improvement:", ln=True)
        pdf.set_font(FONT_FAMILY, '', 10)
        for item in summary.get("weaknesses", []):
            pdf.set_x(MARGIN)
            pdf.multi_cell(PRINTABLE_WIDTH, 6, sanitize_text(f"  * {item}"))
        pdf.ln(10)

        # --- Question Analysis ---
        pdf.chapter_title("Question-by-Question Analysis")
        analysis = feedback_data.get("question_analysis", [])
        
        for idx, round_data in enumerate(analysis, 1):
            pdf.set_font(FONT_FAMILY, 'B', 11)
            header = f"Question {idx} (Score: {round_data.get('score', 'N/A')}/10)"
            pdf.cell(0, 8, sanitize_text(header), ln=True)
            
            # Question
            pdf.set_font(FONT_FAMILY, 'I', 10)
            pdf.set_x(MARGIN)
            pdf.multi_cell(PRINTABLE_WIDTH, 6, sanitize_text(f"Q: {round_data.get('question', '')}"))
            pdf.ln(2)

            # Answer
            pdf.set_font(FONT_FAMILY, 'B', 10)
            pdf.cell(0, 6, "Your Answer:", ln=True)
            pdf.set_font(FONT_FAMILY, '', 10)
            pdf.set_x(MARGIN)
            pdf.multi_cell(PRINTABLE_WIDTH, 6, sanitize_text(round_data.get('answer', '')))
            
            # Feedback
            if 'feedback' in round_data:
                 pdf.ln(2)
                 pdf.set_font(FONT_FAMILY, 'B', 10)
                 pdf.cell(0, 6, "Feedback:", ln=True)
                 pdf.set_font(FONT_FAMILY, '', 10)
                 pdf.multi_cell(PRINTABLE_WIDTH, 6, sanitize_text(round_data['feedback']))

            pdf.ln(5)
            # Divider Line
            pdf.set_draw_color(200, 200, 200)
            pdf.line(MARGIN, pdf.get_y(), PDF_WIDTH - MARGIN, pdf.get_y())
            pdf.ln(5)
            pdf.set_draw_color(0, 0, 0)

        # --- Transcript ---
        pdf.add_page()
        pdf.chapter_title("Full Interview Transcript")
        for msg in transcript:
            speaker = 'Interviewer (Alex)' if msg.type == 'ai' else 'Candidate'
            
            # Color coding
            if speaker.startswith('Interviewer'):
                pdf.set_text_color(0, 51, 102) # Dark Blue
            else:
                pdf.set_text_color(0, 100, 0) # Dark Green
                
            pdf.set_font(FONT_FAMILY, 'B', 10)
            pdf.cell(0, 6, f"{speaker}:", ln=True)
            pdf.set_text_color(0, 0, 0)
            pdf.set_font(FONT_FAMILY, '', 10)
            pdf.set_x(MARGIN)
            pdf.multi_cell(PRINTABLE_WIDTH, 6, sanitize_text(msg.content))
            pdf.ln(3)

        pdf.output(filepath)
        logger.info(f"PDF generated successfully: {filepath}")
        return filepath

    except Exception as e:
        logger.error(f"FATAL PDF ERROR: {e}")
        return None