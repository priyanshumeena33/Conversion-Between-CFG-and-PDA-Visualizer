from flask import Flask, render_template, request, jsonify
import re

app = Flask(__name__)

class CFGToPDAConverter:
    def __init__(self, cfg_rules):
        self.cfg_rules = self.parse_cfg(cfg_rules)
        self.start_symbol = list(self.cfg_rules.keys())[0] if self.cfg_rules else 'S'
        
    def parse_cfg(self, rules_text):
        rules = {}
        for line in rules_text.strip().split('\n'):
            if '->' in line:
                left, right = line.split('->')
                left = left.strip()
                alternatives = [alt.strip() for alt in right.split('|')]
                rules[left] = alternatives
        return rules
    
    def convert(self):
        states = ['q₀', 'q₁', 'q₂']
        input_alphabet = set()
        stack_alphabet = {'Z₀'}
        transitions = []
        
        # Extract alphabets
        for non_terminal, productions in self.cfg_rules.items():
            stack_alphabet.add(non_terminal)
            for prod in productions:
                for char in prod:
                    if char.islower() and char != 'ε':
                        input_alphabet.add(char)
                    elif char != 'ε':
                        stack_alphabet.add(char)
        
        # Initial transition
        transitions.append({
            'from': 'q₀',
            'to': 'q₁',
            'input': 'ε',
            'pop': 'Z₀',
            'push': self.start_symbol + 'Z₀'
        })
        
        # Production rules
        for non_terminal, productions in self.cfg_rules.items():
            for prod in productions:
                transitions.append({
                    'from': 'q₁',
                    'to': 'q₁',
                    'input': 'ε',
                    'pop': non_terminal,
                    'push': prod
                })
        
        # Terminal matching
        for terminal in input_alphabet:
            transitions.append({
                'from': 'q₁',
                'to': 'q₁',
                'input': terminal,
                'pop': terminal,
                'push': 'ε'
            })
        
        # Final transition
        transitions.append({
            'from': 'q₁',
            'to': 'q₂',
            'input': 'ε',
            'pop': 'Z₀',
            'push': 'ε'
        })
        
        return {
            'states': states,
            'input_alphabet': list(input_alphabet),
            'stack_alphabet': list(stack_alphabet),
            'transitions': transitions,
            'start_state': 'q₀',
            'initial_stack_symbol': 'Z₀',
            'final_states': ['q₂']
        }



@app.route('/theory')
def theory():
    return render_template('theory.html')



@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert/cfg-to-pda', methods=['POST'])
def cfg_to_pda():
    data = request.json
    cfg_rules = data.get('cfg', '')
    
    try:
        converter = CFGToPDAConverter(cfg_rules)
        pda = converter.convert()
        return jsonify({'success': True, 'pda': pda})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True)