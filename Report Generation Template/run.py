import jinja2
from jinja2 import Template
import json

def generate_report(data):
    env = jinja2.Environment(loader = jinja2.FileSystemLoader('.'))
    template = env.get_template("ReportTemplate.tex")
    
    
    output = template.render(
        report_id="15-11-2025\_16-06-12\_edison\_213522251444",
        athlete_name = "Edison Tan",
        data=data, #dictionary containing performance details, joint consistency details(array) , colors(array), file name of figures(array)
        logo_icon='logo_tight.png',
        skeleton_joints =  '00000.jpg',
        hand_release = '00069.jpg'
    )
    
    with open("AthleteReport.tex", 'w') as f:
        print(output, file = f)

def read_data():
    with open('data.json') as f:
        data = json.load(f)
    return data

data = read_data()

# Assuming data is separated / sectioned by date
generate_report(data['20241111'])

