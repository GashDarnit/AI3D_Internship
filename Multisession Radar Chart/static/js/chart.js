var colors = ['red', 'green', 'blue', 'orange', 'magenta', 'purple', 'brown', 'gray', 'violet', 'cyan'];

// Transform the data dynamically
var performanceData = Object.keys(originalJSON).map((dateKey, index) => {
    var entry = originalJSON[dateKey];
    return {
        name: dateKey, // Use the date as the dataset name
        data: [
            { "performance": "Grouping", "score": entry.grouping },
            { "performance": "Consistency", "score": entry.consistency },
            { "performance": "DFL", "score": entry.dfl },
            { "performance": "Anchor", "score": entry.anchor },
            { "performance": "Bow Stability", "score": entry["bow stability"] },
            { "performance": "Bow Balance", "score": entry["bow balance"] },
            { "performance": "Strength", "score": entry.strength },
            { "performance": "Aiming", "score": entry.aiming }
        ]
    };
});

// Create a dataset for joints
var jointsData = Object.keys(originalJSON).map((dateKey) => {
    var entry = originalJSON[dateKey];
    return {
        name: dateKey, // Use the date as the dataset name
        data: entry.joints.map((value, index) => ({
            performance: `J${String(index + 1).padStart(2, "0")}`, // J01, J02, ...
            score: value
        }))
    };
});

var colors = ['red', 'green', 'blue', 'orange', 'magenta', 'purple', 'brown', 'gray', 'violet', 'cyan'];

am4core.ready(function () {
    am4core.useTheme(am4themes_animated);

    function createRadarChart(divId, chartData) {
        var chart = am4core.create(divId, am4charts.RadarChart);
        chart.data = chartData[0].data;

        chart.maskBullets = false;
        chart.fontFamily = "Arial";

        var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
        categoryAxis.dataFields.category = "performance";
        categoryAxis.renderer.tooltipLocation = 0.01;

        var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
        valueAxis.renderer.axisFills.template.fillOpacity = 0.05;
        valueAxis.renderer.gridType = "polygons";
        
        if(divId === "performanceChart") valueAxis.min = 40;
        else valueAxis.min = 70;
        valueAxis.max = 100;
        valueAxis.renderer.labels.template.opacity = 0.5;
        valueAxis.strictMinMax = true;

        chartData.forEach((dataset, index) => {
            var series = chart.series.push(new am4charts.RadarSeries());
            series.data = dataset.data;
            series.dataFields.valueY = "score";
            series.dataFields.categoryX = "performance";
            series.name = dataset.name;
            series.strokeWidth = 3;

            var color = colors[index];
            series.stroke = am4core.color(color);
            series.tooltip.getFillFromObject = false;
            series.tooltip.getStrokeFromObject = true;
            series.tooltip.background.fill = am4core.color(color);
            series.tooltip.background.cornerRadius = 5;

            var bullet = series.bullets.push(new am4charts.CircleBullet());
            bullet.circle.fill = am4core.color("#FFFFFF");
            bullet.circle.stroke = am4core.color(color);
            bullet.circle.strokeWidth = 2;
            bullet.tooltipText = "{valueY}";
        });

        chart.legend = new am4charts.Legend();
    }

    createRadarChart("performanceChart", performanceData);
    createRadarChart("jointsChart", jointsData);
});