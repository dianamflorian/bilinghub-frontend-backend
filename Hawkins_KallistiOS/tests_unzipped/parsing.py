import sys, json, re
def parse(stdout):
    res = []
    for line in stdout.splitlines():
        m = re.search(r'tests/(\S+)::(\S+)\s+(PASSED|FAILED)', line)
        if m: res.append({"name": f"tests/{m.group(1)}::{m.group(2)}", "status": m.group(3)})
    return res
if __name__ == "__main__":
    stdout = open(sys.argv[1]).read()
    with open(sys.argv[3], 'w') as f: json.dump({"tests": parse(stdout)}, f, indent=2)
