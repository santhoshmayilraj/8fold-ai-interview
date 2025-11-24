from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.output_parsers.json import JsonOutputParser
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from llm_utils import get_llm, get_feedback_llm
from typing import TypedDict, Annotated, List, Optional
import operator
import logging
from pdf_generator import create_feedback_pdf

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- 1. The "Smart" State ---
class InterviewAgentState(TypedDict):
    messages: Annotated[List, operator.add]
    job_description: Optional[str]
    resume: Optional[str]
    
    # Internal Logic Variables (The "Brain" State)
    difficulty: str             # "Easy", "Medium", "Hard"
    critique: str               # The Critic's internal notes
    question_count: int

# --- 2. The Multi-Node Agent ---
class InterviewAgent:
    def __init__(self):
        self.llm = get_llm() 
        self.memory = MemorySaver()
        self.graph = self._build_graph()

    def _build_graph(self):
        graph = StateGraph(InterviewAgentState)
        
        # Node A: The Critic (Analyzes the user's input logic)
        graph.add_node("critic", self._critic_node)
        # Node B: The Interviewer (Generates the voice response)
        graph.add_node("interviewer", self._interviewer_node)
        
        # The Flow: Start -> Critic -> Interviewer -> End
        graph.set_entry_point("critic")
        graph.add_edge("critic", "interviewer")
        graph.add_edge("interviewer", END)
        
        return graph.compile(checkpointer=self.memory)

    # --- NODE A: THE CRITIC (Hidden Brain) ---
    def _critic_node(self, state: InterviewAgentState):
        messages = state["messages"]
        
        # If this is the very start (only system prompt), skip critique
        if len(messages) <= 1:
            return {"critique": "Start of interview.", "difficulty": "Medium"}

        # Get the user's last answer
        last_user_msg = messages[-1].content
        current_diff = state.get("difficulty", "Medium")
        
        # The Critic's Prompt (Strict Logic - not for the user to see)
        prompt = f"""
        ACT AS: The Logic Engine behind an interview bot.
        ANALYZE the candidate's latest answer: "{last_user_msg}"
        CURRENT DIFFICULTY: {current_diff}
        
        DECISION RULES:
        1. If answer is Short/Vague -> Set Difficulty="Easy", Critique="Probe for details."
        2. If answer is Good/Specific -> Set Difficulty="Hard", Critique="Move to advanced topic."
        3. If answer is "I don't know" -> Set Difficulty="Easy", Critique="Offer a conceptual hint."
        4. If answer is Off-Topic -> Critique="Politely steer back to topic."
        5. If user asks to Skip -> Critique="Comply and move on."
        6. If answer is "(Candidate remained silent)" -> Critique="Check in on candidate gently. Ask if they need a hint."
        
        Return ONLY a string in this format: DIFFICULTY|CRITIQUE
        Example: Hard|Strong answer, asking complex follow-up.
        """
        
        # Non-streaming call for logic
        try:
            response = self.llm.invoke([SystemMessage(content=prompt)])
            content = response.content.strip()
            
            if "|" in content:
                diff, crit = content.split("|", 1)
            else:
                diff, crit = current_diff, content
                
            return {"difficulty": diff.strip(), "critique": crit.strip()}
        except:
            return {"difficulty": "Medium", "critique": "Continue interview."}

    # --- NODE B: THE INTERVIEWER (The Voice) ---
    def _interviewer_node(self, state: InterviewAgentState):
        # Get context from state
        jd = state.get('job_description', '')
        resume = state.get('resume', '')
        critique = state.get('critique', 'Continue')
        difficulty = state.get('difficulty', 'Medium')
        
        # The Speaker's Prompt (Polite Persona)
        system_prompt = f"""
        IDENTITY: You are Alex, a Professional Technical Interviewer.
        CONTEXT: 
        - Job: {jd[:800]}...
        - Resume Highlights: {resume[:1000]}...
        
        INTERNAL INSTRUCTION (FROM LOGIC ENGINE):
        - Assessment: {critique}
        - Target Difficulty: {difficulty}
        
        TASK:
        Generate the next verbal response based on the Internal Instruction.
        - If Logic says "Probe": Ask "Could you be more specific about...?"
        - If Logic says "Move to advanced": Ask a complex scenario question based on the Resume.
        - If Logic says "Hint": Give a small nudge without giving the answer.
        - ALWAYS Reference the Resume where possible (e.g., "I see you used X in project Y").
        
        Keep it conversational. Max 3 sentences.
        """
        
        # Generate the actual speech
        # We pass the message history so conversation flows naturally
        response = self.llm.invoke([SystemMessage(content=system_prompt)] + state["messages"])
        
        return {"messages": [response], "question_count": state.get("question_count", 0) + 1}

    # --- 3. Interface Methods ---

    def start_interview(self, job_description, resume, session_id: str):
        config = {"configurable": {"thread_id": session_id}}
        
        # We inject a hidden "trigger" message to start the flow
        initial_state = {
            "messages": [HumanMessage(content="I am ready. Please introduce yourself.")],
            "job_description": job_description,
            "resume": resume,
            "difficulty": "Medium",
            "critique": "Start",
            "question_count": 0
        }
        
        # Run the graph (Critic -> Interviewer)
        result = self.graph.invoke(initial_state, config)
        
        # Return only the text content of the last message (The Interviewer's greeting)
        return result["messages"][-1].content

    # --- ROBUST MANUAL STREAMING (Replaces the Graph Event Stream) ---
    async def stream_interact(self, user_message: str, session_id: str):
        """
        Manually runs the Critic -> Interviewer flow to guarantee streaming works.
        """
        config = {"configurable": {"thread_id": session_id}}

        # 1. Inject User Message into State
        self.graph.update_state(config, {"messages": [HumanMessage(content=user_message)]})
        
        # 2. Get the latest state
        state = self.graph.get_state(config).values
        
        # 3. Run the CRITIC (Logic) - Non-streaming
        # We call the internal function directly to get the difficulty/critique
        critic_result = self._critic_node(state)
        
        # Update state with Critic's decision
        self.graph.update_state(config, critic_result)
        
        # 4. Run the INTERVIEWER (Voice) - STREAMING
        # We reconstruct the prompt here to ensure we can call .stream() directly
        
        # Re-fetch updated state (now containing critique)
        state = self.graph.get_state(config).values
        
        jd = state.get('job_description', '')
        resume = state.get('resume', '')
        critique = state.get('critique', 'Continue')
        difficulty = state.get('difficulty', 'Medium')
        
        system_prompt = f"""
        IDENTITY: You are Alex, a Professional Technical Interviewer.
        CONTEXT: 
        - Job: {jd[:800]}...
        - Resume Highlights: {resume[:1000]}...
        
        INTERNAL INSTRUCTION (FROM LOGIC ENGINE):
        - Assessment: {critique}
        - Target Difficulty: {difficulty}
        
        TASK:
        Generate the next verbal response.
        - If Logic says "Probe": Ask "Could you be more specific about...?"
        - If Logic says "Move to advanced": Ask a complex scenario question based on the Resume.
        - If Logic says "Hint": Give a small nudge.
        - ALWAYS Reference the Resume where possible.
        
        Keep it conversational. Max 3 sentences.
        """
        
        full_response = ""
        try:
            # DIRECT STREAM CALL (Guarantees tokens reach the frontend)
            async for chunk in self.llm.astream([SystemMessage(content=system_prompt)] + state["messages"]):
                content = chunk.content
                if content:
                    yield content
                    full_response += content
        except Exception as e:
            logger.error(f"Streaming Error: {e}")
            yield "I'm having trouble connecting. Could you repeat that?"
            full_response = "Error."

        # 5. Finalize State
        self.graph.update_state(config, {"messages": [AIMessage(content=full_response)], "question_count": state.get("question_count", 0) + 1})

    def interact(self, user_message: str, session_id: str):
        """
        Synchronous interaction (Fallback).
        """
        config = {"configurable": {"thread_id": session_id}}
        
        # Update state and run
        self.graph.update_state(config, {"messages": [HumanMessage(content=user_message)]})
        result = self.graph.invoke(None, config)
        
        return result["messages"][-1].content

    def end_interview(self, session_id: str):
        config = {"configurable": {"thread_id": session_id}}
        state_values = self.graph.get_state(config).values
        
        if not state_values:
            return None, {"error": "Session not found"}

        job_desc = state_values.get('job_description', "General Role")
        messages = state_values.get('messages', [])
        
        # Clean Transcript (Remove System messages)
        transcript = [msg for msg in messages if not isinstance(msg, SystemMessage) and "I am ready" not in msg.content]
        transcript_str = "\n".join([f"{'Alex' if isinstance(m, AIMessage) else 'Candidate'}: {m.content}" for m in transcript])

        # Default fallback
        feedback_json = {
            "overall_summary": {"strengths": ["N/A"], "weaknesses": ["N/A"], "final_verdict": "Analysis Failed"},
            "question_analysis": []
        }

        try:
            feedback_llm = get_feedback_llm()
            parser = JsonOutputParser()
            chain = feedback_llm | parser
            
            prompt = f"""
            You are an Expert Interview Coach. 
            ROLE: {job_desc[:500]}
            TRANSCRIPT: {transcript_str}
            
            OUTPUT JSON:
            {{
                "overall_summary": {{
                    "strengths": ["List 3"],
                    "weaknesses": ["List 3"],
                    "final_verdict": "HIRE / NO HIRE",
                    "soft_skill_score": "1-10",
                    "hard_skill_score": "1-10"
                }},
                "question_analysis": [
                    {{ "question": "Summary", "answer": "Summary", "feedback": "Critique", "score": 1-10 }}
                ]
            }}
            """
            generated = chain.invoke(prompt)
            if generated: feedback_json = generated
            
        except Exception as e:
            logger.error(f"Feedback Gen Error: {e}")

        try:
            pdf_path = create_feedback_pdf(session_id, transcript, feedback_json)
            return pdf_path, feedback_json
        except Exception as e:
            return None, {"error": str(e)}