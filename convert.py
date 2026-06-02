import pandas as pd
import json
import re

def excel_to_json(excel_path, json_path):
    # 1. 读取 Excel 文件
    df = pd.read_excel(excel_path)
    
    # 2. 数据清洗：将纯空格替换为 NaN，以便触发向下填充
    df = df.replace(r'^\s*$', pd.NA, regex=True)
    
    # 3. 向下填充：处理“空格代表与上一格内容相同”的逻辑
    df = df.ffill()
    df = df.fillna('')  # 防止首行若为空产生 NaN
    
    # 4. 格式化“字”列：去除开头的数字（如 "1哀" -> "哀"）
    df['字'] = df['字'].astype(str).apply(lambda x: re.sub(r'^\d+', '', x).strip())
    
    # 5. 格式化“释义”列：去除开头的带圈数字（如 "①"、"②"）
    df['释义'] = df['释义'].astype(str).apply(lambda x: re.sub(r'^[①②③④⑤⑥⑦⑧⑨⑩]+', '', x).strip())
    
    # 6. 构建 JSON 数据结构
    result = []
    for idx, row in df.iterrows():
        result.append({
            "id": idx + 1,
            "char": row['字'],
            "keyword": row['关键词'],
            "meaning": row['释义'],
            "sentence": row['例句'],
            "familiarity": 0
        })
        
    # 7. 写入 JSON 文件（确保中文不被转义，并格式化缩进）
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    print(f"转换成功，已保存至 {json_path}")

if __name__ == "__main__":
    # 替换为你的实际文件路径
    input_excel = "input.xlsx"   
    output_json = "default.json"  
    excel_to_json(input_excel, output_json)