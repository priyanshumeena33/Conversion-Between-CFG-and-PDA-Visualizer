// Tab Management
function openTab(evt, tabName) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let content of tabContents) {
        content.classList.remove('active');
    }

    const tabButtons = document.getElementsByClassName('tab-button');
    for (let button of tabButtons) {
        button.classList.remove('active');
    }

    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
}

// CFG to PDA Conversion
function convertCFGtoPDA() {
    const cfgInput = document.getElementById('cfg-input').value.trim();
    
    if (!cfgInput) {
        alert('Please enter a CFG!');
        return;
    }

    try {
        const cfg = parseCFG(cfgInput);
        const pda = cfgToPDA(cfg);
        
        displayCFGSteps(cfg);
        displayPDA(pda);
        
        document.getElementById('cfg-steps').style.display = 'block';
        document.getElementById('cfg-pda-result').style.display = 'block';
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function parseCFG(input) {
    const lines = input.split('\n').filter(line => line.trim());
    const productions = {};
    let startSymbol = null;

    lines.forEach((line, index) => {
        const parts = line.split('->').map(s => s.trim());
        if (parts.length !== 2) {
            throw new Error(`Invalid production at line ${index + 1}`);
        }

        const [left, right] = parts;
        if (index === 0) startSymbol = left;

        if (!productions[left]) {
            productions[left] = [];
        }

        const alternatives = right.split('|').map(s => s.trim());
        productions[left].push(...alternatives);
    });

    return { productions, startSymbol };
}

function cfgToPDA(cfg) {
    const states = ['q₀', 'q₁', 'q₂'];
    const inputAlphabet = new Set();
    const stackAlphabet = new Set(['Z₀']);
    const transitions = [];

    // Extract terminals and non-terminals
    for (let nonTerminal in cfg.productions) {
        stackAlphabet.add(nonTerminal);
        cfg.productions[nonTerminal].forEach(prod => {
            for (let char of prod) {
                if (char !== 'ε' && char === char.toLowerCase() && /[a-z]/.test(char)) {
                    inputAlphabet.add(char);
                } else if (char !== 'ε') {
                    stackAlphabet.add(char);
                }
            }
        });
    }

    // Initial transition
    transitions.push({
        from: 'q₀',
        to: 'q₁',
        input: 'ε',
        pop: 'Z₀',
        push: cfg.startSymbol + 'Z₀'
    });

    // Production transitions
    for (let nonTerminal in cfg.productions) {
        cfg.productions[nonTerminal].forEach(production => {
            const pushSymbols = production === 'ε' ? 'ε' : production;
            transitions.push({
                from: 'q₁',
                to: 'q₁',
                input: 'ε',
                pop: nonTerminal,
                push: pushSymbols
            });
        });
    }

    // Terminal matching transitions
    inputAlphabet.forEach(terminal => {
        transitions.push({
            from: 'q₁',
            to: 'q₁',
            input: terminal,
            pop: terminal,
            push: 'ε'
        });
    });

    // Final transition
    transitions.push({
        from: 'q₁',
        to: 'q₂',
        input: 'ε',
        pop: 'Z₀',
        push: 'ε'
    });

    return {
        states,
        inputAlphabet: Array.from(inputAlphabet),
        stackAlphabet: Array.from(stackAlphabet),
        transitions,
        startState: 'q₀',
        initialStackSymbol: 'Z₀',
        finalStates: ['q₂']
    };
}

function displayCFGSteps(cfg) {
    const stepsContent = document.getElementById('cfg-steps-content');

    let html = `
    <h3 style="margin-bottom:10px;">Conversion Steps</h3>

    <div class="steps-table">
    <table>
    <thead>
        <tr>
            <th>Step</th>
            <th>Title</th>
            <th>Details</th>
        </tr>
    </thead>

    <tbody>

    <tr>
        <td>1</td>
        <td>Initialize PDA</td>
        <td>Create states: q₀ (start), q₁ (processing), q₂ (accept)</td>
    </tr>

    <tr>
        <td>2</td>
        <td>Initial Configuration</td>
        <td>δ(q₀, ε, Z₀) = (q₁, ${cfg.startSymbol}Z₀)</td>
    </tr>

    <tr>
        <td>3</td>
        <td>Production Rules</td>
        <td>
    `;

    // 🔥 dynamic productions
    for (let nonTerminal in cfg.productions) {
        cfg.productions[nonTerminal].forEach(prod => {
            html += `δ(q₁, ε, ${nonTerminal}) = (q₁, ${prod})<br>`;
        });
    }

    html += `
        </td>
    </tr>

    <tr>
        <td>4</td>
        <td>Terminal Matching</td>
        <td>For each terminal: δ(q₁, a, a) = (q₁, ε)</td>
    </tr>

    <tr>
        <td>5</td>
        <td>Final Transition</td>
        <td>δ(q₁, ε, Z₀) = (q₂, ε)</td>
    </tr>

    </tbody>
    </table>
    </div>
    `;

    stepsContent.innerHTML = html;
}

function displayPDA(pda) {
    // Display formal definition
    

    // Display transitions
    const transDiv = document.getElementById('pda-transitions-content');
    let transHtml = '';
    pda.transitions.forEach(t => {
        transHtml += `<div class="transition-item">δ(${t.from}, ${t.input}, ${t.pop}) = (${t.to}, ${t.push})</div>`;
    });
    transDiv.innerHTML = transHtml;

    // Draw state diagram
    drawPDADiagram(pda);
}

function drawPDADiagram(pda) {
    const svg = document.getElementById('pda-diagram');
    svg.innerHTML = '';

    // 🌟 MAGIC FIX: Makes the diagram fully responsive!
    svg.setAttribute('viewBox', '0 0 800 380');
    svg.style.width = '100%';
    svg.style.height = 'auto';

    // Define arrowhead marker
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#FEE715" />
        </marker>
    `;
    svg.appendChild(defs);

    // Shifted Y coordinates from 175 to 250 so top labels don't get cut
    const statePositions = {
        'q₀': { x: 150, y: 250 },
        'q₁': { x: 400, y: 250 },
        'q₂': { x: 650, y: 250 }
    };

    const radius = 35;

    // Group transitions by from-to pair
    const transitionGroups = {};
    pda.transitions.forEach(t => {
        const key = `${t.from}-${t.to}`;
        if (!transitionGroups[key]) {
            transitionGroups[key] = [];
        }
        transitionGroups[key].push(t);
    });

    // Draw transitions
    Object.keys(transitionGroups).forEach(key => {
        const transitions = transitionGroups[key];
        const from = transitions[0].from;
        const to = transitions[0].to;

        if (from === to) {
            drawSelfLoop(svg, statePositions[from], transitions, radius);
        } else {
            drawTransition(svg, statePositions[from], statePositions[to], transitions, radius);
        }
    });

    // Draw start arrow
    drawStartArrow(svg, statePositions['q₀'], radius);

    // Draw states
    pda.states.forEach(state => {
        const pos = statePositions[state];
        const isFinal = pda.finalStates.includes(state);
        drawState(svg, pos.x, pos.y, state, state === pda.startState, isFinal, radius);
    });
}

    // Draw start arrow
    drawStartArrow(svg, statePositions['q₀'], radius);

    // Draw states
    pda.states.forEach(state => {
        const pos = statePositions[state];
        const isFinal = pda.finalStates.includes(state);
        drawState(svg, pos.x, pos.y, state, state === pda.startState, isFinal, radius);
    });


function drawState(svg, x, y, label, isStart, isFinal, radius) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `state ${isStart ? 'start' : ''} ${isFinal ? 'final' : ''}`);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', radius);
    g.appendChild(circle);

    if (isFinal) {
        const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        innerCircle.setAttribute('cx', x);
        innerCircle.setAttribute('cy', y);
        innerCircle.setAttribute('r', radius - 5);
        innerCircle.setAttribute('fill', 'none');
        innerCircle.setAttribute('stroke', '#FEE715');
        innerCircle.setAttribute('stroke-width', '2');
        g.appendChild(innerCircle);
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y + 5);
    text.setAttribute('text-anchor', 'middle');
    text.textContent = label;
    g.appendChild(text);

    svg.appendChild(g);
}

function drawTransition(svg, from, to, transitions, radius) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / distance;
    const unitY = dy / distance;

    const startX = from.x + unitX * radius;
    const startY = from.y + unitY * radius;
    const endX = to.x - unitX * radius;
    const endY = to.y - unitY * radius;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${startX} ${startY} L ${endX} ${endY}`;
    path.setAttribute('d', d);
    path.setAttribute('class', 'transition-line');
    svg.appendChild(path);

    // Add label
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    const labels = [];

// group similar transitions
    const grouped = {};
    
    transitions.forEach(t => {
        const key = `${t.input},${t.pop}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t.push);
    });
    
    for (let key in grouped) {
        labels.push(`${key} → ${grouped[key].join(' | ')}`);
    }
    
    labels.forEach((labelText, index) => {
        const yOffset = (index - labels.length / 2) * 14;
        
        const textBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const textWidth = labelText.length * 6.5;
        textBg.setAttribute('x', midX - textWidth / 2);
        textBg.setAttribute('y', midY - 18 + yOffset);
        textBg.setAttribute('width', textWidth);
        textBg.setAttribute('height', 14);
        textBg.setAttribute('class', 'transition-label-bg');
        svg.appendChild(textBg);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', midX);
        text.setAttribute('y', midY - 8 + yOffset);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'transition-label');
        text.textContent = labelText;
        svg.appendChild(text);
    });
}

function drawSelfLoop(svg, pos, transitions, radius) {
    const cx = pos.x;
    const cy = pos.y - radius - 130; // Shifted loop curve higher to give labels breathing room

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${pos.x + 18} ${pos.y - radius + 5} 
               Q ${pos.x + 55} ${pos.y - radius - 45}, ${pos.x} ${pos.y - radius - 60}
               Q ${pos.x - 55} ${pos.y - radius - 45}, ${pos.x - 18} ${pos.y - radius + 5}`;
    path.setAttribute('d', d);
    path.setAttribute('class', 'transition-line');
    path.setAttribute('fill', 'none'); 
    path.setAttribute('stroke', '#FEE715'); // Kept your yellow color
    path.setAttribute('stroke-width', '2');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    svg.appendChild(path);

    // Add labels
    const grouped = {};

    transitions.forEach(t => {
        const key = `${t.input}, ${t.pop}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t.push);
    });
    
    const labels = Object.keys(grouped).map(key => {
        return `${key} → ${grouped[key].join(' | ')}`;
    });
    
    // Position labels nicely above the loop
    labels.forEach((label, index) => {
        const yOffset = index * 24; 
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', cx);
        text.setAttribute('y', cy + yOffset + 20); 
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'transition-label');
        text.setAttribute('fill', '#FEE715'); // Match the line color
        text.setAttribute('font-size', '14px');
        text.setAttribute('font-family', 'monospace');
        text.textContent = label;
        svg.appendChild(text);
    });
}

function drawStartArrow(svg, pos, radius) {
    const startX = pos.x - radius - 40;
    const endX = pos.x - radius;
    const y = pos.y;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', startX);
    line.setAttribute('y1', y);
    line.setAttribute('x2', endX);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', '#FEE715');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('marker-end', 'url(#arrowhead)');
    svg.appendChild(line);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', startX - 8);
    text.setAttribute('y', y + 4);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('fill', '#FEE715');
    text.setAttribute('font-size', '12');
    text.textContent = 'start';
    svg.appendChild(text);
}

// PDA to CFG Conversion
// PDA to CFG Conversion
// PDA to CFG Conversion
function convertPDAtoCFG() {
    try {
        const pda = parsePDAInput();
        document.getElementById("auto-start-state").value = pda.startState;
        document.getElementById("auto-final-states").value = pda.finalStates.join(', ');
        
        // 1. Asli math algorithm run hoga
        const rawCfg = pdaToCFG(pda); 
        
        // 2. Steps display honge (jisme original transition dikhegi)
        displayPDASteps(pda);
        
        // 3. ✨ Naya Beautifier call hoga! ✨
        const cleanCfg = beautifyCFG(rawCfg);
        
        // 4. Clean CFG ko display karo
        displayFinalCFG(cleanCfg); 
        
        document.getElementById('pda-steps').style.display = 'block';
        document.getElementById('pda-cfg-result').style.display = 'block';
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function insertPDASymbol(symbol) {
    const textarea = document.getElementById("pda-transitions-input");
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    textarea.value =
        textarea.value.substring(0, start) +
        symbol +
        textarea.value.substring(end);

    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + symbol.length;
}

function beautifyCFG(rawCfg) {
    let cleanProds = {};
    let nameMap = {};
    let varCounter = 0; // Sahi declaration

    // Helper: Triplet [p,X,q] ko clean name deta hai (A, B... Z, A1, B1...)
    function getCleanName(variable) {
        if (variable === 'S') return 'S'; // Start symbol S hi rahega
        
        if (!nameMap[variable]) {
            let letter = String.fromCharCode(65 + (varCounter % 26)); 
            let number = Math.floor(varCounter / 26);
            let newName = number > 0 ? letter + number : letter;
            
            // Skip 'S' taaki duplicate S na ban jaye
            if (newName === 'S') {
                varCounter++;
                letter = String.fromCharCode(65 + (varCounter % 26));
                number = Math.floor(varCounter / 26);
                newName = number > 0 ? letter + number : letter;
            }
            
            nameMap[variable] = newName;
            varCounter++;
        }
        return nameMap[variable];
    }

    // Pass 1: Direct terminals dhundho (jaise [q1, a, q1] -> a)
    let directTerminals = {};
    for (let left in rawCfg.productions) {
        rawCfg.productions[left].forEach(right => {
            let cleanRight = right.trim();
            // Agar rule sirf 'a', 'b', ya 'ε' hai
            if (cleanRight === 'a' || cleanRight === 'b' || cleanRight === 'ε') {
                directTerminals[left] = cleanRight === 'ε' ? '' : cleanRight;
            }
        });
    }

    // Pass 2: Rules ko simplify aur rename karo
    for (let left in rawCfg.productions) {
        let newRules = new Set();
        
        rawCfg.productions[left].forEach(right => {
            let cleanRule = right;
            
            // 1. Direct terminals replace karo
            for (let tVar in directTerminals) {
                cleanRule = cleanRule.split(tVar).join(directTerminals[tVar]);
            }

            // 2. Bachi hui triplets [p,X,q] ko A, B, C se replace karo
            let triplets = cleanRule.match(/\[.*?\]/g);
            if (triplets) {
                triplets.forEach(t => {
                    cleanRule = cleanRule.split(t).join(getCleanName(t));
                });
            }

            // 3. Spaces hatao
            cleanRule = cleanRule.replace(/\s+/g, '');
            if (cleanRule === '') cleanRule = 'ε';

            // 4. Agar rule mein abhi bhi koi kachra (unmatched brackets) nahi hai, toh keep it
            if (cleanRule && !cleanRule.includes('[')) {
                newRules.add(cleanRule);
            }
        });

        // Agar is variable ke paas valid rules bache hain, toh save karo
        if (newRules.size > 0) {
            let cleanLeft = getCleanName(left);
            cleanProds[cleanLeft] = Array.from(newRules);
        }
    }

    return {
        startSymbol: getCleanName(rawCfg.startSymbol),
        productions: cleanProds
    };
}


function generateCleanCFG(pda) {
    let pushA = false;
    let popA = false;
    let hasA = false;
    let hasB = false;

    pda.transitions.forEach(t => {
        if (t.push.includes('A') && t.push.length > 1) pushA = true;
        if (t.pop === 'A' && t.push === 'ε') popA = true;
        if (t.input === 'a') hasA = true;
        if (t.input === 'b') hasB = true;
    });

    let productions = {};

    // 🎯 a^n b^n
    if (pushA && popA) {
        productions['S'] = ['aSb', 'ε'];
    }
    // 🎯 only a
    else if (hasA && !hasB) {
        productions['S'] = ['aS', 'a'];
    }
    // 🎯 only b
    else if (!hasA && hasB) {
        productions['S'] = ['bS', 'b'];
    }
    // 🎯 general
    else {
        productions['S'] = ['aS', 'bS', 'a', 'b'];
    }

    return {
        startSymbol: 'S',
        productions
    };
}

function displayFinalCFG(cfg) {
    const div = document.getElementById('final-cfg-pda');

    let rules = [];

    for (let left in cfg.productions) {
        const right = cfg.productions[left].join(' | ');
        rules.push(`${left} → ${right}`);
    }

    div.innerHTML = rules.join('<br>');
}




/*

function simplifyCFG(cfg) {

    let hasEpsilon = false;
    let terminals = new Set();
    let patterns = new Set();

    for (let left in cfg.productions) {
        cfg.productions[left].forEach(rule => {

            if (rule === 'ε') {
                hasEpsilon = true;
            }

            const chars = rule.match(/[a-z]/g);
            if (chars) {
                chars.forEach(c => terminals.add(c));
            }

            if (rule.includes('a') && rule.includes('b')) {
                patterns.add('aSb');
            }

            if (rule.includes('a') && !rule.includes('b')) {
                patterns.add('aS');
            }

            if (rule.includes('b') && !rule.includes('a')) {
                patterns.add('bS');
            }

        });
    }


    let finalRules = [];

    if (patterns.has('aSb')) finalRules.push('aSb');
    if (patterns.has('aS')) finalRules.push('aS');
    if (patterns.has('bS')) finalRules.push('bS');

    terminals.forEach(t => finalRules.push(t));

    if (hasEpsilon) finalRules.push('ε');

    finalRules = [...new Set(finalRules)];

    return {
        startSymbol: 'S',
        productions: {
            'S': finalRules
        }
    };
}
*/
function showPage(evt, page) {

    document.querySelectorAll('.page').forEach(p => {
        p.style.display = 'none';
    });

    document.getElementById(page + '-page').style.display = 'block';

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });

    evt.currentTarget.classList.add('active');
}

function parsePDAInput() {
    const transitionsInput = document.getElementById('pda-transitions-input').value.trim();

    if (!transitionsInput) {
        throw new Error('Please enter transitions');
    }
    
    const transitions = [];
    const statesSet = new Set();
    const inputAlphabetSet = new Set();
    const stackAlphabetSet = new Set();
    
    const lines = transitionsInput.split('\n').filter(l => l.trim());
    
    lines.forEach(line => {
        const match = line.match(/δ\(([^,]+),\s*([^,]+),\s*([^)]+)\)\s*=\s*\(([^,]+),\s*([^)]+)\)/);
        
        if (match) {
            const from = match[1].trim();
            const input = match[2].trim();
            const pop = match[3].trim();
            const to = match[4].trim();
            const push = match[5].trim();
    
            transitions.push({ from, input, pop, to, push });
    
            // auto collect
            statesSet.add(from);
            statesSet.add(to);
    
            if (input !== 'ε') inputAlphabetSet.add(input);
            if (pop !== 'ε') stackAlphabetSet.add(pop);
            if (push !== 'ε') {
                push.split('').forEach(s => stackAlphabetSet.add(s));
            }
        }
    });
    
    if (transitions.length === 0) {
        throw new Error('Invalid transitions format');
    }
    
    // 🔥 auto assumptions
    const states = Array.from(statesSet);
    const inputAlphabet = Array.from(inputAlphabetSet);
    const stackAlphabet = Array.from(stackAlphabetSet);
    const startState = states[0]; // first state
    const initialStackSymbol = 'Z0';
    const finalStates = [states[states.length - 1]];
    
    return {
        states,
        inputAlphabet,
        stackAlphabet,
        transitions,
        startState,
        initialStackSymbol,
        finalStates
    };

    
}

function pdaToCFG(pda) {
    const productions = {};
    const startSymbol = 'S';
    
    // Add start production
    productions[startSymbol] = [];
    pda.finalStates.forEach(finalState => {
        productions[startSymbol].push(`[${pda.startState},${pda.initialStackSymbol},${finalState}]`);
    });

    // Generate productions from transitions
    pda.transitions.forEach(trans => {
        const { from: p, input: a, pop: A, to: q, push } = trans;
        
        if (push === 'ε') {
            // A → a for pop without push
            const left = `[${p},${A},${q}]`;
            const right = a === 'ε' ? 'ε' : a;
            if (!productions[left]) productions[left] = [];
            if (!productions[left].includes(right)) {
                productions[left].push(right);
            }
        } else {
            // Handle push operations
            const pushSymbols = push.split('').filter(s => s !== 'ε' && s.trim());
            
            if (pushSymbols.length === 1) {
                pda.states.forEach(r => {
                    const left = `[${p},${A},${r}]`;
                    const right = a === 'ε' ? `[${q},${pushSymbols[0]},${r}]` : `${a}[${q},${pushSymbols[0]},${r}]`;
                    if (!productions[left]) productions[left] = [];
                    if (!productions[left].includes(right)) {
                        productions[left].push(right);
                    }
                });
            } else if (pushSymbols.length >= 2) {
                pda.states.forEach(r => {
                    pda.states.forEach(s => {
                        const left = `[${p},${A},${s}]`;
                        const right = a === 'ε' ? 
                            `[${q},${pushSymbols[0]},${r}][${r},${pushSymbols[1]},${s}]` :
                            `${a}[${q},${pushSymbols[0]},${r}][${r},${pushSymbols[1]},${s}]`;
                        if (!productions[left]) productions[left] = [];
                        if (!productions[left].includes(right)) {
                            productions[left].push(right);
                        }
                    });
                });
            }
        }
    });

    return { productions, startSymbol };
}



function insertSymbol(symbol) {
    const textarea = document.getElementById('cfg-input');

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const text = textarea.value;

    textarea.value = text.substring(0, start) + symbol + text.substring(end);

    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + symbol.length;
}



function displayPDASteps(pda) {
    const stepsContent = document.getElementById('pda-steps-content');

    let html = `
    <h3 style="margin-bottom:10px;">Conversion Steps</h3>

    <div class="steps-table">
    <table>
    <thead>
        <tr>
            <th>Step</th>
            <th>Title</th>
            <th>Details</th>
        </tr>
    </thead>

    <tbody>

    <tr>
        <td>1</td>
        <td>Variable Notation</td>
        <td>Create variables [p,A,q] for each state pair and stack symbol</td>
    </tr>

    <tr>
        <td>2</td>
        <td>Start Production</td>
        <td>S → [${pda.startState},${pda.initialStackSymbol},${pda.finalStates[0]}]</td>
    </tr>

    <tr>
        <td>3</td>
        <td>Convert Transitions</td>
        <td>
    `;

    // 🔥 dynamic transitions
    pda.transitions.forEach(t => {
        html += `δ(${t.from}, ${t.input}, ${t.pop}) = (${t.to}, ${t.push})<br>`;
    });

    html += `
        </td>
    </tr>

    <tr>
        <td>4</td>
        <td>Simplification</td>
        <td>Remove useless variables and simplify grammar</td>
    </tr>

    </tbody>
    </table>
    </div>
    `;

    stepsContent.innerHTML = html;
}

function displayCFG(cfg) {
    const prodDiv = document.getElementById('cfg-productions');
    let html = `<div class="production-item"><strong>Start Symbol:</strong> ${cfg.startSymbol}</div>`;
    html += `<div style="margin-top: 10px;"><strong>Production Rules:</strong></div>`;
    
    for (let left in cfg.productions) {
        const right = cfg.productions[left].join(' | ');
        html += `<div class="production-item">${left} → ${right}</div>`;
    }
    
    prodDiv.innerHTML = html;
}

// Auto-format states with subscript conversion
function formatStates(input) {
    const states = input.split(',').map(s => s.trim()).filter(s => s);
    return states.map((s, i) => {
        // Extract q and number
        const match = s.match(/q(\d+)/);
        if (match) {
            return `q${toSubscript(match[1])}`;
        }
        return s.startsWith('q') ? s : `q${toSubscript(i)}`;
    });
}

function toSubscript(num) {
    const subscripts = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return num.toString().split('').map(d => subscripts[parseInt(d)]).join('');
}

// Event listeners for auto-formatting
document.getElementById('pda-states')?.addEventListener('input', function(e) {
    const formatted = formatStates(this.value);
    document.getElementById('formatted-states').textContent = formatted.join(', ');
});

document.getElementById('pda-input-alphabet')?.addEventListener('input', function(e) {
    const symbols = this.value.split(',').map(s => s.trim()).filter(s => s);
    document.getElementById('formatted-input-alphabet').textContent = symbols.join(', ');
});

document.getElementById('pda-stack-alphabet')?.addEventListener('input', function(e) {
    const symbols = this.value.split(',').map(s => s.trim()).filter(s => s);
    document.getElementById('formatted-stack-alphabet').textContent = symbols.join(', ');
});

// Clear functions
function clearCFGInput() {
    document.getElementById('cfg-input').value = '';
    document.getElementById('cfg-steps').style.display = 'none';
    document.getElementById('cfg-pda-result').style.display = 'none';
}

function clearPDAInput() {
    document.getElementById('pda-transitions-input').value = '';
    document.getElementById('pda-steps').style.display = 'none';
    document.getElementById('pda-cfg-result').style.display = 'none';
}



function loadPDAExample() {

    document.getElementById("pda-transitions-input").value =
`δ(q0, a, Z0) = (q0, AZ0)
δ(q0, a, A) = (q0, AA)
δ(q0, b, A) = (q1, ε)
δ(q1, b, A) = (q1, ε)
δ(q1, ε, Z0) = (q1, Z0)`;

    document.getElementById("pda-cfg-result").style.display = "none";
    document.getElementById("pda-steps").style.display = "none";
}


function setCFGExample(type) {
    const input = document.getElementById("cfg-input");

    const examples = {
        anbn: `S -> aSb | ε`,
        
        palindrome: `S -> aSa | bSb | a | b | ε`,
        
        equal: `S -> aSb | bSa | SS | ε`,
        
        simple: `S -> aS | a`
    };

    input.value = examples[type];

    // 🧹 reset previous result (important)
    document.getElementById("cfg-pda-result").style.display = "none";
    document.getElementById("cfg-steps").style.display = "none";
}







// Example loaders
function loadCFGExample() {
    document.getElementById("cfg-input").value = `S -> aSb | ε`;

    // reset UI
    document.getElementById("cfg-pda-result").style.display = "none";
    document.getElementById("cfg-steps").style.display = "none";
}

