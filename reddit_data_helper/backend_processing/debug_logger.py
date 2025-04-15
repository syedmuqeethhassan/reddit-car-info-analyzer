import sys
import os
import time
import threading
from datetime import datetime

class DebugLogger:
    """
    A utility for making debug messages highly visible in a terminal
    with multiple processes running (like React, Node, and Python).
    """
    
    # ANSI color codes for terminal output
    COLORS = {
        'red': '\033[91m',
        'green': '\033[92m',
        'yellow': '\033[93m',
        'blue': '\033[94m',
        'magenta': '\033[95m',
        'cyan': '\033[96m',
        'white': '\033[97m',
        'reset': '\033[0m',
        'bold': '\033[1m',
    }
    
    @staticmethod
    def log_summary(summary):
        """Log a summary with high visibility in the terminal"""
        color = DebugLogger.COLORS['green']
        bold = DebugLogger.COLORS['bold']
        reset = DebugLogger.COLORS['reset']
        
        # Get terminal width (default to 100 if can't determine)
        try:
            term_width = os.get_terminal_size().columns
        except (AttributeError, OSError):
            term_width = 100
        
        # Create a border that fills the terminal width
        border = f"{color}{bold}{'*' * term_width}{reset}"
        
        # Get timestamp
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        # Print with high visibility
        print("\n\n")
        print(border)
        print(f"{color}{bold}* GEMINI SUMMARY - GENERATED AT {timestamp} {reset}")
        print(border)
        print(f"{bold}{summary}{reset}")
        print(border)
        print(f"{color}{bold}* END OF GEMINI SUMMARY {reset}")
        print(border)
        print("\n\n")
        
        # Force flush stdout to ensure immediate display
        sys.stdout.flush()
    
    @staticmethod
    def log_status(message, color='yellow'):
        """Log a status message with the specified color"""
        c = DebugLogger.COLORS.get(color, DebugLogger.COLORS['yellow'])
        reset = DebugLogger.COLORS['reset']
        bold = DebugLogger.COLORS['bold']
        
        print(f"\n{c}{bold}[PYTHON SERVER] {message}{reset}\n")
        sys.stdout.flush()