import jinja2
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

def generate_report(data, dates, colors):
    template = latex_jinja_env.get_template('WebChart.tex')

    output = template.render(
        logo_icon="logo_tight.png",
        athlete_name="Holden Yip",
        data=data, # performance data(consistency, grouping, etc.), joints
        dates=dates, # dates/sessions
        colors=colors # Array of hard-coded colors
    )
    
    with open("MultisessionDataAnalysis.tex", 'w') as f:
        print(output, file = f)

def read_data():
    with open('data.json') as f:
        data = json.load(f)
    return data

data = read_data()
dates = ['20241111', '20241112', '20241113'] #dates/sessions selected are put into a list

#hard-coded colors => means that there is a limit to only 10 total viewable sessions at a time to avoid array out of bounds for colors
colors = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'brown',  'gray', 'violet', 'olive']

generate_report(data, dates, colors)
