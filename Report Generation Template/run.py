import jinja2
import os
from jinja2 import Template
import json

latex_jinja_env = jinja2.Environment(
	block_start_string = '\BLOCK{',
	block_end_string = '}',
	variable_start_string = '\VAR{',
	variable_end_string = '}',
	comment_start_string = '\#{',
	comment_end_string = '}',
	line_statement_prefix = '%%',
	line_comment_prefix = '%#',
	trim_blocks = True,
	autoescape = False,
	loader = jinja2.FileSystemLoader('.')
)

def generate_report(data, score):
    #env = jinja2.Environment(loader = jinja2.FileSystemLoader('.'))
    template = latex_jinja_env.get_template("ReportTemplate.tex")
    
    
    output = template.render(
        report_id="09-09-2023\_16-06-12\_holden\_213522251444",
        athlete_name = "Holden Yip",
        data=data, #dictionary containing performance details, joint consistency details(array) , colors(array), file name of figures(array)
        score_dict=score, #session - x, y
        logo_icon='logo_tight.png',
        skeleton_joints =  '00000.jpg',
        hand_release = '00069.jpg'
    )
    
    with open("AthleteReport.tex", 'w') as f:
        print(output, file = f)

def read_data(filename):
    with open(filename) as f:
        data = json.load(f)
    return data

data = read_data('data.json')
score = read_data('score.json')

# Assuming data is separated / sectioned by date
generate_report(data['20241111'], score)

