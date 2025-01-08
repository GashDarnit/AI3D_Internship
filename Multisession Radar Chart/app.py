from flask import Flask, render_template, request, redirect, url_for, send_from_directory, jsonify, send_file
import os
import subprocess
import jinja2
import json

app = Flask(__name__)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'static')
REPORTS_DIR = os.path.join(STATIC_DIR, 'reports')

# Jinja2 Environment for LaTeX templates
latex_jinja_env = jinja2.Environment(
    block_start_string='\BLOCK{',
    block_end_string='}',
    variable_start_string='\VAR{',
    variable_end_string='}',
    comment_start_string='\#{',
    comment_end_string='}',
    line_statement_prefix='%%',
    line_comment_prefix='%#',
    trim_blocks=True,
    autoescape=False,
    loader=jinja2.FileSystemLoader(os.path.join(BASE_DIR, 'static', 'template'))
)

################ Helper Methods #########################
def generate_report(data, dates, colors, name, remarks):
    # Paths for the TeX and PDF files
    output_tex_path = os.path.join(REPORTS_DIR, name + '.tex')  # Path for the .tex file
    output_pdf_path = os.path.join(BASE_DIR, name + '.pdf')  # Path for the .pdf file
    logo_path = os.path.join(STATIC_DIR, 'images', 'logo_tight.png')
    logo_path = logo_path.replace("\\", "/")
    
    max_joint = max(len(data[date]['joints']) for date in data)
    
    def cleanup_misc_files(tex_path,  name):
        os.remove(tex_path) # Delete TeX file
        os.remove(os.path.join(BASE_DIR, name + '.aux')) # Delete aux file
        os.remove(os.path.join(BASE_DIR, name + '.log')) # Delete log file
        
    # Ensure the reports directory exists
    if not os.path.exists(REPORTS_DIR):
        os.makedirs(REPORTS_DIR, exist_ok=True)

    # Generate the report content using the template
    template = latex_jinja_env.get_template('WebChart.tex')
    template_remarks = latex_jinja_env.get_template('remarks.tex')
    template_end = latex_jinja_env.get_template('end.tex')
    
    output = template.render(
        logo_icon=logo_path,
        athlete_name=name,
        data=data,  # performance data (consistency, grouping, etc.), joints
        dates=dates,  # dates/sessions
        colors=colors,  # Array of hard-coded colors
        max_joint=max_joint,
    )
    
    if(len(remarks) > 0):
        output += template_remarks.render(remarks=remarks)
    
    output += template_end.render()

    # Write the .tex file
    with open(output_tex_path, 'w') as f:
        f.write(output)
    
    print(f"TeX file written: {output_tex_path}")
    
    # Run pdflatex to generate the PDF
    escaped_tex_path = f'"{output_tex_path}"'  # Escape path for spaces
    os.system(f"pdflatex -interaction nonstopmode {escaped_tex_path}")
    
    # Check if the PDF was created
    if os.path.exists(output_pdf_path):
        cleanup_misc_files(output_tex_path, name)
        print(f"PDF successfully created: {output_pdf_path}")
        return output_pdf_path
    else:
        print(f"Failed to create PDF: {output_pdf_path}")
        return os.path.join(BASE_DIR, 'templates', 'error.html') # error.html might never be displayed



def read_data():
    with open('data.json') as f:
        data = json.load(f)
    return data


############### Routes #####################
@app.route('/')
def index():
    print(REPORTS_DIR)
    
    data = read_data()
    users = data.keys()
    return render_template('index.html', users=users)

@app.route('/get-user-data/<username>')
def get_user_data(username):
    data = read_data()
    user_data = data.get(username, {})

    if not user_data:
        return "<p>No data available for this user.</p>", 404

    # Generate the user data in JSON format to use for chart rendering
    return jsonify(user_data)

@app.route('/generate', methods=['POST'])
def generate():
    try:
        # Fetching data from the request
        content = request.get_json()
        data = content['data']
        name = content['name']
        remarks = content['remarks']
        dates = list(data.keys())
        colors = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'brown',  'gray', 'violet', 'olive']
        
        if not os.path.exists(REPORTS_DIR):
            os.makedirs(REPORTS_DIR, exist_ok=True)

        output_path = generate_report(data, dates, colors, name, remarks)
        return send_file(output_path, as_attachment=True, download_name=name + '.pdf')

    except Exception as e:
        print("Error processing the data:", e)
        return jsonify({"error": "Error generating report"}), 500

if __name__ == "__main__":
    app.run(debug=True)
