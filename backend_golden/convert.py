import re

interface_md_path = r"c:\Users\diana-florian\Downloads\PROYECTOS FREELANCE OUTLIER\REAL CODE\2do proyecto real code\files (1)\INTERFACE.md"
prompt_txt_path = r"c:\Users\diana-florian\Downloads\PROYECTOS FREELANCE OUTLIER\REAL CODE\2do proyecto real code\files (1)\PROMPT.txt"

def build_list():
    with open(interface_md_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    lines = content.split('\n')
    header_idx = -1
    for i, line in enumerate(lines):
        if line.startswith('|------|'):
            header_idx = i
            break
            
    rows = lines[header_idx+1:]
    items = []
    
    count = 1
    for row in rows:
        row = row.strip()
        if not row or not row.startswith('|'): continue
        parts = [p.strip() for p in row.split('|')]
        # parts is ['', path, name, type, input, output, desc, '']
        if len(parts) >= 8:
            path = parts[1]
            name = parts[2]
            typ = parts[3]
            inp = parts[4]
            out = parts[5]
            desc = parts[6]
            
            # Apply description updates
            if "handle_sub_del" in name:
                desc = "Specifically processes customer.subscription.deleted. MUST explicitly close any active GracePeriod and suppress retries per Terminal Invariant."
            elif "refresh_sync" in name:
                desc = "Synchronous Stripe read to repair period/state. MUST close active GracePeriod if cancellation is detected."
            elif "execute_retry" in name:
                desc = "Calls Stripe.Invoice.pay for a scheduled retry. MUST lock user account after 3rd episode failure."
            elif "mask_secrets" in name:
                desc = "Denylist-based secret masking before logs. Precisely masks fields: client_secret, headers, tokens, passwords, card, cvv."
            elif "map_stripe_error" in name:
                desc = "Maps Stripe upstream exceptions strictly to HTTP 429, 502, 503, 400, 500."
            elif "cancel_sub" in name:
                desc = "Sets cancel_at_period_end=True and explicitly suppresses retries."

            # Determine Language-Specific Fields
            lang = "None"
            if "Model" in typ and "backend" in path:
                lang = "Bases: db.Model"
            elif "/api/" in path or "ingress" in name:
                # routes
                lang = "Decorators: @app.route or @blueprint.route"
            elif "guard" in name:
                lang = "Decorators: @wraps"
            elif "Component" in typ or ".tsx" in path:
                lang = "Type: React.FC"
                
            item_md = f"""{count}. **Path**: {path} | **Name**: {name}
   - **Type**: {typ} | **Input**: {inp} | **Output**: {out}
   - **Description**: {desc}
   - **Language-Specific Fields**: {lang}"""
            
            items.append(item_md)
            count += 1
            
    list_str = "\n".join(items)
    
    # Write to INTERFACE.md
    new_int_md = f"""# BillingHub — Deterministic Interface (Exact 50-Item List)

MANDATORY: Every implementation surface MUST be documented with exactly 7 fields.

{list_str}
"""
    with open(interface_md_path, 'w', encoding='utf-8') as f:
        f.write(new_int_md)
        
    # Read PROMPT.txt and replace the table
    with open(prompt_txt_path, 'r', encoding='utf-8') as f:
        prompt_content = f.read()
        
    # Replace Table Section
    # Find start and end of table
    table_start = prompt_content.find('## Expected Interface')
    if table_start != -1:
        new_prompt = prompt_content[:table_start] + f"## Expected Interface (MANDATORY 50-ITEM EXHAUSTIVE LIST)\n\n{list_str}\n"
        with open(prompt_txt_path, 'w', encoding='utf-8') as f:
            f.write(new_prompt)

if __name__ == "__main__":
    build_list()
