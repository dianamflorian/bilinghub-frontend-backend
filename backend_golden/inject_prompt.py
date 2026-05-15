import re

int_path = r"c:\Users\diana-florian\Downloads\PROYECTOS FREELANCE OUTLIER\REAL CODE\2do proyecto real code\files (1)\INTERFACE.md"
prmpt_path = r"c:\Users\diana-florian\Downloads\PROYECTOS FREELANCE OUTLIER\REAL CODE\2do proyecto real code\files (1)\PROMPT.txt"

with open(int_path, "r", encoding="utf-8") as f:
    int_content = f.read()

# find "## Expected Interface" portion
sec_start = int_content.find("## Expected Interface")
inject_str = int_content[sec_start:]

with open(prmpt_path, "r", encoding="utf-8") as f:
    prompt_content = f.read()

prmp_sec_start = prompt_content.find("## Expected Interface")
if prmp_sec_start != -1:
    new_prompt = prompt_content[:prmp_sec_start] + inject_str
    with open(prmpt_path, "w", encoding="utf-8") as f:
        f.write(new_prompt)
