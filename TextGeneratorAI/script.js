// Global variables
let messages = [];
let sessionStartTime = new Date().toISOString();
let isDarkMode = false; // Default to light mode
let currentSessionIndex = -1; // Track current session for renaming
// Initialize application when DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
    // Apply light mode by default
    document.body.classList.add('light-mode');
    document.getElementById('theme-toggle').querySelector('span').textContent = 'Mode gelap';
    document.getElementById('dark-icon').style.display = 'none';
    document.getElementById('light-icon').style.display = 'block';
    
    // Initialize history list
    loadHistoryList();
    
    // Initialize sidebar state for mobile
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('active'); // Ensure sidebar is hidden by default on mobile
        document.getElementById('menu-icon').style.display = 'block';
        document.getElementById('close-icon').style.display = 'none';
    }
    
    // Add event listeners
    addEventListeners();
    
    // Handle window resize for sidebar
    window.addEventListener('resize', function() {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.remove('active');
            document.getElementById('menu-icon').style.display = 'block';
            document.getElementById('close-icon').style.display = 'none';
        } else {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.add('active'); // Ensure sidebar is visible on desktop
        }
    });
    
    // Example prompt cards click event
    document.querySelectorAll('.example-card').forEach(card => {
        card.addEventListener('click', function() {
            const promptText = this.querySelector('p').textContent.replace(/^"(.*)"$/, '$1');
            document.getElementById('promptInput').value = promptText;
            document.getElementById('promptInput').focus();
        });
    });
});
// Event listeners
function addEventListeners() {
    const input = document.getElementById('promptInput');
    const button = document.getElementById('generateBtn');
    
    if (input && button) {
        input.addEventListener('keypress', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                generateText();
            }
        });
        
        button.addEventListener('click', generateText);
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            const menuIcon = document.getElementById('menu-icon');
            const closeIcon = document.getElementById('close-icon');
            
            sidebar.classList.toggle('active');
            if (sidebar.classList.contains('active')) {
                menuIcon.style.display = 'none';
                closeIcon.style.display = 'block';
            } else {
                menuIcon.style.display = 'block';
                closeIcon.style.display = 'none';
            }
        });
    }
    
    // Start new session button
    const startNewSessionBtn = document.getElementById('startNewSessionBtn');
    if (startNewSessionBtn) {
        startNewSessionBtn.addEventListener('click', startNewSession);
    }
    
    // About AI button
    const aboutAiButton = document.getElementById('about-ai-button');
    if (aboutAiButton) {
        aboutAiButton.addEventListener('click', showAboutAI);
    }
    
    // Home button
    const homeButton = document.getElementById('home-button');
    if (homeButton) {
        homeButton.addEventListener('click', function() {
            startNewSession();
        });
    }
}
// Function to detect if content contains code
function detectCodeContent(content) {
    // Check for common code patterns
    const codePatterns = [
        /<html\s*>/i,
        /<\/html>/i,
        /<head\s*>/i,
        /<\/head>/i,
        /<body\s*>/i,
        /<\/body>/i,
        /<script\s*>/i,
        /<\/script>/i,
        /<style\s*>/i,
        /<\/style>/i,
        /<!DOCTYPE\s+html>/i,
        /function\s+\w+\s*\(/,
        /var\s+\w+\s*=/,
        /let\s+\w+\s*=/,
        /const\s+\w+\s*=/,
        /class\s+\w+\s*{/,
        /\.[\w-]+\s*{[^}]*}/,
        /#[\w-]+\s*{[^}]*}/,
        /\w+\s*{\s*[\w-]+\s*:/,
        /import\s+.*from/,
        /export\s+(default\s+)?/,
        /@import\s+/,
        /\$\(\s*['"]/,
        /document\.getElementById/,
        /document\.querySelector/,
        /addEventListener/,
        /console\.log/,
        /<?php/i,
        /namespace\s+/,
        /use\s+\w+/,
        /class\s+\w+\s*extends/,
        /public\s+function/,
        /private\s+function/,
        /protected\s+function/
    ];
    
    // Check if content contains multiple code indicators
    let codeIndicators = 0;
    for (let pattern of codePatterns) {
        if (pattern.test(content)) {
            codeIndicators++;
        }
    }
    
    // Also check for code blocks (```)
    const codeBlockPattern = /```[\s\S]*```/;
    const hasCodeBlocks = codeBlockPattern.test(content);
    
    // Return true if content has multiple code indicators or explicit code blocks
    return codeIndicators >= 2 || hasCodeBlocks;
}
// Function to escape HTML entities
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
// Function to detect programming language from code
function detectLanguage(code) {
    const languagePatterns = {
        'Python': [/^import\s+/, /^from\s+\w+\s+import/, /^def\s+\w+/, /print\s*\(/, /if\s+__name__\s*==\s*['"]__main__['"]/, /^\s*#/, /pygame\./, /\.append\s*\(/, /^class\s+\w+:/],
        'JavaScript': [/^function\s+\w+/, /^var\s+\w+/, /^let\s+\w+/, /^const\s+\w+/, /console\.log/, /document\./, /^\s*\/\//, /\.addEventListener/],
        'HTML': [/^<!DOCTYPE\s+html/, /^<html/, /^<head/, /^<body/, /^<div/, /^<p/, /^<h[1-6]/, /<\/\w+>/],
        'CSS': [/^\.[\w-]+\s*{/, /^#[\w-]+\s*{/, /@import/, /@media/, /:\s*[\w-]+\s*;/, /background\s*:/],
        'PHP': [/^<\?php/, /\$\w+/, /echo\s+/, /function\s+\w+/, /class\s+\w+/, /->/, /::/, /<?=/],
        'Java': [/^public\s+class/, /^public\s+static\s+void\s+main/, /System\.out\.print/, /^import\s+java\./, /public\s+\w+\s+\w+\s*\(/],
        'C': [/^#include\s*</, /^int\s+main/, /printf\s*\(/, /^#define/, /malloc\s*\(/, /sizeof\s*\(/],
        'C++': [/^#include\s*</, /^using\s+namespace/, /cout\s*<</, /^int\s+main/, /std::/, /class\s+\w+/]
    };
    
    for (const [language, patterns] of Object.entries(languagePatterns)) {
        let matches = 0;
        for (const pattern of patterns) {
            if (pattern.test(code)) {
                matches++;
            }
        }
        // Return language if we find multiple matches
        if (matches >= 2) {
            return language;
        }
    }
    
    return 'Code'; // Default fallback
}
// Function to fix Python comments
function fixPythonComments(code) {
    const lines = code.split('\n');
    const fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Skip empty lines
        if (!line.trim()) {
            fixedLines.push(line);
            continue;
        }
        
        // Pattern untuk mendeteksi comment Python yang belum memiliki #
        const pythonCommentPatterns = [
            // Comment yang dimulai dengan spasi + huruf kapital (standalone comment)
            /^\s+[A-ZŠČĆŽĐ][a-zA-ZščćžđŠČĆŽĐ\s]+$/,
            // Comment dalam kurung
            /^\s*\([A-ZŠaščćžđČĆŽĐ][^)]*\)\s*$/,
            // Comment dengan tanda tanya atau seru
            /^\s+[A-ZŠaščćžđČĆŽĐ][^=]*[?!]\s*$/,
            // Update, Handle, dll
            /^\s+(Update|Handle|Animasi|Gambar|Draw|Setup|Grid|Ukuran|Inisialisasi|Warna)\s+.*/i
        ];
        
        // Cek apakah ini baris kode aktual Python
        const pythonCodePatterns = [
            /^\s*(import|from|def|class|if|for|while|try|except|with|return|yield)/,
            /^\s*\w+\s*=\s*.+/,  // Assignment
            /^\s*\w+\.\w+/,      // Method calls
            /^\s*pygame\./,      // Pygame calls
            /^\s*print\s*\(/,    // Print statements
            /^\s*#/              // Already commented
        ];
        
        // Cek apakah ini kode aktual
        const isActualCode = pythonCodePatterns.some(pattern => pattern.test(line));
        
        if (!isActualCode) {
            // Cek apakah ini comment yang perlu diperbaiki
            const needsCommentFix = pythonCommentPatterns.some(pattern => pattern.test(line));
            
            if (needsCommentFix) {
                // Tambahkan # di depan comment
                const indentMatch = line.match(/^(\s*)/);
                const indent = indentMatch ? indentMatch[1] : '';
                const commentText = line.trim();
                line = indent + '# ' + commentText;
            }
        }
        
        // Handle inline comments (kode + comment dalam satu baris)
        if (isActualCode) {
            // Cek apakah ada comment inline tanpa #
            // Pattern: kode   text_explanation
            const inlineCommentMatch = line.match(/^(\s*\S.*?\S)\s{3,}([A-ZŠaščćžđČĆŽĐ][^#]*?)$/);
            if (inlineCommentMatch) {
                const [, codePart, commentPart] = inlineCommentMatch;
                line = codePart + '  # ' + commentPart.trim();
            }
        }
        
        fixedLines.push(line);
    }
    
    return fixedLines.join('\n');
}
// NEW: Function to clean markdown code blocks from code
function cleanMarkdownDelimiters(code) {
    if (!code) return '';
    
    let cleanedCode = code;
    
    // Remove markdown code block delimiters with language specification
    // Pattern: ```language at the beginning
    cleanedCode = cleanedCode.replace(/^```\w*\s*\n?/gm, '');
    
    // Remove closing ``` at the end or on separate lines
    cleanedCode = cleanedCode.replace(/\n?\s*```\s*$/gm, '');
    cleanedCode = cleanedCode.replace(/^```\s*$/gm, '');
    
    // Remove any remaining standalone ``` lines
    cleanedCode = cleanedCode.replace(/^\s*```\s*$/gm, '');
    
    // Clean up multiple consecutive newlines
    cleanedCode = cleanedCode.replace(/\n{3,}/g, '\n\n');
    
    // Trim whitespace from start and end
    cleanedCode = cleanedCode.trim();
    
    console.log("=== MARKDOWN CLEANING ===");
    console.log("Original code:", code);
    console.log("Cleaned code:", cleanedCode);
    console.log("========================");
    
    return cleanedCode;
}
// Function to format explanation text 
function formatExplanation(explanation) {
    if (!explanation) return '';

    // Remove all instances of triple backticks, optionally followed by a language name
    explanation = explanation.replace(/```(\w+)?/g, "");

    // First, escape all HTML entities in the raw explanation text
    let escapedExplanation = escapeHtml(explanation);

    // Replace double newlines with a unique placeholder for paragraph breaks
    escapedExplanation = escapedExplanation.replace(/\n\n/g, "PARAGRAPH_BREAK_PLACEHOLDER");

    // Replace single newlines with <br> tags
    escapedExplanation = escapedExplanation.replace(/\n/g, "<br>");

    // Split by the paragraph placeholder and wrap each part in <p> tags
    const paragraphs = escapedExplanation.split("PARAGRAPH_BREAK_PLACEHOLDER");

    // Join all paragraphs into a single string, separated by <p> tags
    const combinedExplanation = paragraphs.map(p => `<p>${p.trim()}</p>`).join('');

    return combinedExplanation;
}
// IMPROVED: Function to parse code content and separate explanation from actual code
function parseCodeContent(content) {
    const lines = content.split('\n');
    let topExplanationLines = [];
    let codeLines = [];
    let bottomExplanationLines = [];
    let foundCodeStart = false;
    let foundCodeEnd = false;
    
    // Patterns that indicate start of actual code
    const codeStartPatterns = [
        /^```\w*/, // Markdown code block start
        /^import\s+/,
        /^from\s+\w+\s+import/,
        /^def\s+\w+/,
        /^class\s+\w+/,
        /^if\s+__name__\s*==\s*['"]__main__['"]/,
        /^for\s+\w+\s+in/,
        /^while\s+/,
        /^if\s+/,
        /^\s*#\s*\w+/,
        /^\w+\s*=\s*/,
        /^function\s+\w+/,
        /^var\s+\w+/,
        /^let\s+\w+/,
        /^const\s+\w+/,
        /^<\w+/,
        /^<!DOCTYPE/,
        /^\s*\/\//,
        /^\s*\/\*/,
        /^\s*\*\//,
        /^\w+\s*\(/,
        /^\s+\w+/,
        /^[\w\s]*{/,
        /^[\w\s]*}/,
        /^pygame\./,
        /^print\s*\(/,
        /^return\s/
    ];
    
    // Patterns that indicate explanation text (not code)
    const explanationPatterns = [
        /^penjelasan\s+/i,
        /^untuk\s+/i,
        /^keterangan\s*/i,
        /^catatan\s*/i,
        /^note\s*/i,
        /^deskripsi\s*/i,
        /^cara\s+/i,
        // /^\d+\.\s+/,  // Numbered lists
        // /^-\s+/,      // Bullet points
        // /^\*\s+/,     // Asterisk bullet points
        /^berikut\s+/i,
        /^anda\s+/i,
        /^ini\s+/i,
        /^game\s+ini/i,
        /^program\s+ini/i,
        /^script\s+ini/i,
        /^kode\s+ini/i,
        /^fitur\s*/i,
        /^fungsi\s*/i
    ];
    
    // First pass: identify code boundaries
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines in boundary detection
        if (!line) continue;
        
        // Check if this line looks like code
        const looksLikeCode = codeStartPatterns.some(pattern => pattern.test(line));
        const looksLikeExplanation = explanationPatterns.some(pattern => pattern.test(line));
        
        if (!foundCodeStart && looksLikeCode && !looksLikeExplanation) {
            foundCodeStart = true;
        }
        
        // Look for end of code (explanation patterns after code started)
        if (foundCodeStart && !foundCodeEnd && looksLikeExplanation) {
            foundCodeEnd = true;
        }
    }
    
    // Second pass: separate content based on boundaries
    let currentSection = 'top-explanation';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const originalLine = lines[i];
        
        // Skip markdown closing delimiters
        if (line === '```') {
            continue;
        }
        
        // Determine what section we're in
        if (!foundCodeStart) {
            // If no clear code found, check each line
            const looksLikeCode = codeStartPatterns.some(pattern => pattern.test(line));
            const looksLikeExplanation = explanationPatterns.some(pattern => pattern.test(line));
            
            if (looksLikeCode && !looksLikeExplanation) {
                currentSection = 'code';
            }
        } else {
            // We found clear code boundaries
            const looksLikeCode = codeStartPatterns.some(pattern => pattern.test(line));
            const looksLikeExplanation = explanationPatterns.some(pattern => pattern.test(line));
            
            if (currentSection === 'top-explanation' && looksLikeCode) {
                currentSection = 'code';
            } else if (currentSection === 'code' && looksLikeExplanation) {
                currentSection = 'bottom-explanation';
            }
        }
        
        // Add line to appropriate section
        switch (currentSection) {
            case 'top-explanation':
                topExplanationLines.push(originalLine);
                break;
            case 'code':
                codeLines.push(originalLine);
                break;
            case 'bottom-explanation':
                bottomExplanationLines.push(originalLine);
                break;
        }
        
        // Additional check for explanation patterns in the middle of what we thought was code
        if (currentSection === 'code' && line) {
            const isDefinitelyExplanation = explanationPatterns.some(pattern => pattern.test(line));
            if (isDefinitelyExplanation) {
                // Move this line to bottom explanation
                codeLines.pop();
                bottomExplanationLines.push(originalLine);
                currentSection = 'bottom-explanation';
            }
        }
    }
    
    // Clean up: remove empty lines from start and end of each section
    const cleanSection = (lines) => {
        while (lines.length > 0 && !lines[0].trim()) lines.shift();
        while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
        return lines;
    };
    
    topExplanationLines = cleanSection(topExplanationLines);
    codeLines = cleanSection(codeLines);
    bottomExplanationLines = cleanSection(bottomExplanationLines);
    
    // If no clear separation was found, treat everything as code
    if (codeLines.length === 0 && topExplanationLines.length === 0 && bottomExplanationLines.length === 0) {
        codeLines = lines;
    }
    
    // Combine explanations
    const allExplanations = [];
    if (topExplanationLines.length > 0) {
        allExplanations.push(...topExplanationLines);
    }
    if (bottomExplanationLines.length > 0) {
        if (allExplanations.length > 0) allExplanations.push(''); // Add separator
        allExplanations.push(...bottomExplanationLines);
    }
    
    return {
        explanation: allExplanations.join('\n').trim(),
        code: codeLines.join('\n').trim()
    };
}
// Function to format content safely
function formatContent(content) {
    // Check if content contains code
    if (detectCodeContent(content)) {
        // Parse content to separate explanation from code
        const parsed = parseCodeContent(content);
        let language = detectLanguage(parsed.code);
        let processedCode = parsed.code;
        
        // CLEAN MARKDOWN DELIMITERS - Apply cleaning first
        processedCode = cleanMarkdownDelimiters(processedCode);
        
        // FIX PYTHON COMMENTS - Apply comment fix for Python after cleaning
        if (language === 'Python') {
            processedCode = fixPythonComments(processedCode);
            console.log("=== PYTHON COMMENT FIX ===" );
            console.log("After markdown cleaning:", processedCode);
            console.log("========================");
        }
        
        let formattedHtml = '<div class="code-response">';
        
        // NEW LAYOUT: Code section FIRST (at top)
        formattedHtml += `
            <div class="code-section">
                <div class="code-header">
                    <span>Kode ${language}:</span>
                    <button class="copy-code-btn" onclick="copyCodeToClipboard(this)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                        </svg>
                        Salin Kode
                    </button>
                </div>
                <pre><code class="actual-code">${escapeHtml(processedCode)}</code></pre>
            </div>
        `;
        
        // NEW LAYOUT: Explanation section SECOND
        if (parsed.explanation) {
            formattedHtml += `
                <div class="code-explanation bottom">
                    <div class="explanation-header">
                        <span>💡 Penjelasan:</span>
                    </div>
                    <div class="explanation-content">
                        ${formatExplanation(parsed.explanation)}
                    </div>
                </div>
            `;
        }
        
        formattedHtml += '</div>';
        return formattedHtml;
    } else {
        // If it's not code, format normally with markdown
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n{2,}/g, '<br>')
            .replace(/\n/g, '<br>');
    }
}
// Function to copy code to clipboard (IMPROVED - only copies actual code)
function copyCodeToClipboard(button) {
    // Find the actual code element specifically, not the explanation
    const codeElement = button.parentElement.nextElementSibling.querySelector('code.actual-code');
    
    if (!codeElement) {
        console.error("Kode tidak ditemukan untuk disalin");
        alert("Gagal menyalin: Kode tidak ditemukan.");
        return;
    }
    
    let codeText = codeElement.textContent;
    
    // ADDITIONAL CLEANING: Remove any remaining markdown delimiters that might have slipped through
    codeText = cleanMarkdownDelimiters(codeText);
    
    // Debug log to verify what's being copied
    console.log("=== COPY DEBUG ===");
    console.log("Raw code element text:", codeElement.textContent);
    console.log("After additional cleaning:", codeText);
    console.log("================");
    
    navigator.clipboard.writeText(codeText).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 0 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
            </svg>
            Tersalin!
        `;
        
        // Add success class for animation
        button.classList.add('success');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('success');
        }, 2000);
    }).catch(err => {
        console.error("Clipboard copy failed:", err.message);
        alert("Gagal menyalin kode: " + err.message);
    });
}
// Generate text function
async function generateText() {
    const input = document.getElementById('promptInput');
    const loading = document.getElementById('loading');
    
    if (!input.value.trim()) {
        alert("Silakan masukkan pertanyaan atau permintaan Anda.");
        return;
    }
    
    // Hide welcome message and show loading
    document.getElementById("welcome-message").style.display = "none";
    loading.style.display = "block";
    
    // Add user message
    const userMessage = { role: 'user', content: input.value.trim() };
    messages.push(userMessage);
    
    // Clear input and render conversation
    input.value = '';
    renderConversation();
    
    // Prepare request data
    const formData = new FormData();
    const messagesJson = JSON.stringify(messages);
    console.log("Sending messages:", messagesJson);
    console.log("Encoded messages:", encodeURIComponent(messagesJson)); // Log encoded JSON
    formData.append("messages", messagesJson);
    
    const url = "backend.php";
    console.log("Fetching URL:", url);
    fetch(url, {
        method: "POST",
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        // Clone response to allow multiple reads
        return response.clone().text().then(text => ({ response, text }));
    })
    .then(({ response, text }) => {
        console.log("Raw server response:", text); // Log raw response for debugging
        return response.json().catch(e => {
            console.error("JSON parsing failed:", e.message, "Raw response:", text);
            throw new Error(`JSON parsing failed: ${e.message}`);
        });
    })
    .then(data => {
        loading.style.display = "none";
        if (data.success) {
            const aiMessage = { role: 'assistant', content: data.data.text };
            messages.push(aiMessage);
            renderConversation();
            saveSessionToLocalStorage();
        } else {
            console.error("API Error:", data.error);
            alert("Error: " + data.error);
        }
    })
    .catch(error => {
        loading.style.display = "none";
        console.error("Fetch Error:", error.message);
        alert("Terjadi kesalahan: " + error.message);
    });
}
// Render conversation
function renderConversation() {
    const container = document.getElementById('conversation-container');
    
    if (messages.length === 0) {
        document.getElementById("welcome-message").style.display = "flex";
        document.getElementById("about-ai-content").style.display = "none";
        container.innerHTML = '';
        return;
    }
    
    document.getElementById("welcome-message").style.display = "none";
    document.getElementById("about-ai-content").style.display = "none";
    
    let html = '';
    
    try {
        messages.forEach((message, index) => {
            // Use the new safe formatting function
            let formattedContent = formatContent(message.content);
            
            const isUser = message.role === 'user';
            const messageType = isUser ? 'user-message' : 'ai-message';
            const iconType = isUser ? 'user-icon' : 'ai-icon';
            const iconSvg = isUser 
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/></svg>';
            
            console.log("Rendering SVG for", isUser ? "User" : "AI", iconSvg); // Debug SVG
            
            const copyButton = !isUser ? 
                `<div class="message-actions">
                    <button class="copy-button" data-message-index="${index}" onclick="copyToClipboard(${index}, this)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                        </svg>
                        Salin
                    </button>
                </div>` : '';
                
            html += `
                <div class="message-wrapper ${messageType}">
                    <div class="message">
                        <div class="message-header">
                            <div class="${iconType}">
                                ${iconSvg}
                            </div>
                            <span>${isUser ? 'Anda' : 'Lintas AI'}</span>
                        </div>
                        <div class="message-content">
                            ${formattedContent}
                        </div>
                        ${copyButton}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    } catch (e) {
        console.error("Error rendering conversation:", e.message);
        alert("Gagal merender percakapan: " + e.message);
    }
}
// Copy message to clipboard
function copyToClipboard(index, button) {
    console.log("Attempting to copy message at index:", index);
    if (!messages[index] || messages[index].role !== 'assistant') {
        console.error("Invalid message index or not an AI message:", index);
        alert("Gagal menyalin: Pesan tidak valid.");
        return;
    }
    let rawText = messages[index].content;
    
    rawText = rawText
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/```([^`]+)```/g, '$1')
        .replace(/`([^`]+)`/g, '$1');
    
    console.log("Text to copy:", rawText);
    
    navigator.clipboard.writeText(rawText).then(() => {
        console.log("Text copied successfully");
        const originalText = button.innerHTML;
        
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 0 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
            </svg>
            Tersalin!
        `;
        
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error("Clipboard copy failed:", err.message);
        alert("Gagal menyalin teks: " + err.message);
    });
}
// Save session to localStorage
function saveSessionToLocalStorage() {
    if (messages.length > 0) {
        let history = JSON.parse(localStorage.getItem("chat_history") || "[]");
        
        const existingIndex = history.findIndex(session => 
            session.timestamp === sessionStartTime);
            
        if (existingIndex >= 0) {
            history[existingIndex].messages = messages;
            if (!history[existingIndex].name) {
                history[existingIndex].name = messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? "..." : "");
            }
        } else {
            history.push({
                name: messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? "..." : ""),
                timestamp: sessionStartTime,
                messages: messages
            });
        }
        
        localStorage.setItem("chat_history", JSON.stringify(history));
        loadHistoryList();
    }
}
// Load session from localStorage
function loadHistoryList() {
    const listContainer = document.getElementById('sessionList');
    const history = JSON.parse(localStorage.getItem("chat_history") || "[]");
    
    if (history.length === 0) {
        listContainer.innerHTML = "<p style='padding: 10px; color: rgba(255,255,255,0.5); font-size: 14px;'>Tidak ada riwayat percakapan.</p>";
        return;
    }
    
    // Sort by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    listContainer.innerHTML = '';
    
    history.forEach((session, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'chat-history-item';
        historyItem.dataset.timestamp = session.timestamp;
        
        historyItem.innerHTML = `
            <div class="chat-item-content" onclick="loadSession('${session.timestamp}')">
                <span class="chat-item-title">${session.name}</span>
                <small class="chat-item-date">${new Date(session.timestamp).toLocaleString('id-ID')}</small>
            </div>
            <div class="chat-item-actions">
                <button class="chat-item-edit" onclick="renameSession(${index}, '${session.timestamp}')" title="Ubah nama">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                    </svg>
                </button>
                <button class="chat-item-delete" onclick="deleteSession('${session.timestamp}')" title="Hapus">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                    </svg>
                </button>
            </div>
        `;
        
        listContainer.appendChild(historyItem);
    });
}
// Load specific session
function loadSession(timestamp) {
    const history = JSON.parse(localStorage.getItem("chat_history") || "[]");
    const session = history.find(s => s.timestamp === timestamp);
    
    if (session && session.messages) {
        messages = session.messages;
        sessionStartTime = timestamp;
        renderConversation();
    }
}
// Delete session
function deleteSession(timestamp) {
    if (confirm("Apakah Anda yakin ingin menghapus percakapan ini?")) {
        let history = JSON.parse(localStorage.getItem("chat_history") || "[]");
        history = history.filter(session => session.timestamp !== timestamp);
        localStorage.setItem("chat_history", JSON.stringify(history));
        
        // If current session is deleted, start new session
        if (sessionStartTime === timestamp) {
            startNewSession();
        }
        
        loadHistoryList();
    }
}
// Rename session
function renameSession(index, timestamp) {
    currentSessionIndex = index;
    const dialog = document.getElementById('rename-dialog');
    const input = document.getElementById('rename-input');
    
    const history = JSON.parse(localStorage.getItem("chat_history") || "[]");
    const session = history.find(s => s.timestamp === timestamp);
    
    if (session) {
        input.value = session.name;
        dialog.style.display = 'flex';
        input.focus();
        input.select();
        
        // Setup event listeners for rename dialog
        const cancelBtn = document.getElementById('rename-cancel');
        const confirmBtn = document.getElementById('rename-confirm');
        
        cancelBtn.onclick = () => {
            dialog.style.display = 'none';
        };
        
        confirmBtn.onclick = () => {
            const newName = input.value.trim();
            if (newName) {
                session.name = newName;
                localStorage.setItem("chat_history", JSON.stringify(history));
                loadHistoryList();
                dialog.style.display = 'none';
            }
        };
        
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            } else if (e.key === 'Escape') {
                cancelBtn.click();
            }
        };
    }
}
// Start new session
function startNewSession() {
    messages = [];
    sessionStartTime = new Date().toISOString();
    document.getElementById('conversation-container').innerHTML = '';
    document.getElementById("welcome-message").style.display = "flex";
    document.getElementById("about-ai-content").style.display = "none";
    document.getElementById('promptInput').focus();
    
    // Close sidebar on mobile after starting new session
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('active');
        document.getElementById('menu-icon').style.display = 'block';
        document.getElementById('close-icon').style.display = 'none';
    }
}
// Show About AI
function showAboutAI() {
    document.getElementById("welcome-message").style.display = "none";
    document.getElementById("about-ai-content").style.display = "block";
    document.getElementById('conversation-container').innerHTML = '';
    
    // Close sidebar on mobile after showing about
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('active');
        document.getElementById('menu-icon').style.display = 'block';
        document.getElementById('close-icon').style.display = 'none';
    }
}
// Toggle theme
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const darkIcon = document.getElementById('dark-icon');
    const lightIcon = document.getElementById('light-icon');
    const themeText = themeToggle.querySelector('span');
    
    if (isDarkMode) {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        darkIcon.style.display = 'none';
        lightIcon.style.display = 'block';
        themeText.textContent = 'Mode gelap';
        isDarkMode = false;
    } else {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        darkIcon.style.display = 'block';
        lightIcon.style.display = 'none';
        themeText.textContent = 'Mode terang';
        isDarkMode = true;
    }
}