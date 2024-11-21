// Keep global variable to avoid constantly doing GET requests to the backend
var currentData = {};
var selectedUser = undefined;
var addedRemarks = [];
var deleteIndex = undefined;

function resetInfo(newUser, newData) {
    currentData = newData;
    selectedUser = newUser;
    addedRemarks = [];
    deleteIndex = undefined;
}

function showNotification(message) {
    var notification = document.getElementById('session-selection-count-exceeded');
    
    // Set the notification message
    notification.querySelector('p').textContent = message;

    // Add the slide-in animation class
    notification.style.animation = 'slide-in 0.5s forwards';

    // Remove the notification after 1 second
    setTimeout(function () {
        notification.style.animation = 'slide-out 0.5s forwards';
    }, 5000);
}


function updateRemarksList() {
    const remarksListContainer = $('#remarks-items');
    remarksListContainer.empty(); // Clear the list first

    // Add each remark as a card
    addedRemarks.forEach((remark, index) => {
        const remarkCard = $('<div>')
            .addClass('bg-gray-100 p-4 rounded-lg shadow-md mb-2 cursor-pointer')
            .append(
                $('<p>').text(remark).addClass('text-gray-800')
            )
            .click(function() {
                // Clear the previously selected card
                $('#remarks-items .selected').removeClass('selected');

                // Mark this card as selected
                $(this).addClass('selected');

                // When a remark card is clicked, populate the textarea for editing
                $('#remarks-text').val(remark);

                // Store the index of the remark being edited in the textarea
                $('#remarks-text').data('edit-index', index);
            });

        // Append the remark card to the list
        remarksListContainer.append(remarkCard);
    });
}

function deleteRemark(index) {
    addedRemarks.splice(index, 1); // Remove the remark from the array
    updateRemarksList(); // Update the remarks list to reflect the deletion
    deleteIndex = undefined;
}

function getScrollbarWidth() {
    // Create a temporary div element with scrollbars
    const div = document.createElement('div');
    div.style.overflow = 'scroll';
    div.style.visibility = 'hidden';
    div.style.position = 'absolute';
    div.style.width = '100px';
    div.style.height = '100px';
    document.body.appendChild(div);
    
    const scrollbarWidth = div.offsetWidth - div.clientWidth;
    
    // Remove the temporary div element
    document.body.removeChild(div);
    
    return scrollbarWidth;
}

// Function to retrieve selected sessions
function getSelectedSessions() {
    var selectedSessions = [];
    // Loop through all the session cards that are marked as selected
    $('#sessions-form .bg-gray-300').each(function() {
        selectedSessions.push($(this).attr('data-session')); // Get the session key
    });
    return selectedSessions;
}


function generateRadarChart(originalJSON) {
    // Clear the previous chart if it exists
    $('#performanceChart').empty();
    $('#jointsChart').empty();
    
    var colors = ['red', 'lime', 'blue', 'orange', 'magenta', 'purple', 'brown', 'gray', 'violet', 'cyan'];

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
    
    var dataAverage = {};
    for (const key in originalJSON) {
        const session = originalJSON[key];
        const performanceCategory = ["grouping", "consistency", "dfl", "anchor", "bow stability", "bow balance", "strength", "aiming"];
        let performanceAverage = 0;
        let jointsAverage = 0;
        
        performanceCategory.forEach((item) => {
            performanceAverage += session[item];
        });
        performanceAverage /= 8; //8 categories
        
        session['joints'].forEach((item) => {
            jointsAverage += item;
        });
        jointsAverage /= 10;
        
        dataAverage[key] = [performanceAverage, jointsAverage];
    }
    
    
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
                bullet.circle.fill = am4core.color("#F2A78F");
                bullet.circle.stroke = am4core.color(color);
                bullet.circle.strokeWidth = 2;
                bullet.tooltipText = "{valueY}";
            });

            chart.legend = new am4charts.Legend();
        }
        
        function createLineChart(divId, averages) {
            const chartData = Object.keys(averages).map(session => ({
                session,
                performance: averages[session][0],
                joints: averages[session][1],
            }));

            var chart = am4core.create(divId, am4charts.XYChart);
            chart.data = chartData;

            var categoryAxis = chart.xAxes.push(new am4charts.CategoryAxis());
            categoryAxis.dataFields.category = "session";
            categoryAxis.title.text = "Session";

            var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
            valueAxis.title.text = "Average Score";

            var performanceSeries = chart.series.push(new am4charts.LineSeries());
            performanceSeries.dataFields.valueY = "performance";
            performanceSeries.dataFields.categoryX = "session";
            performanceSeries.name = "Performance";
            performanceSeries.strokeWidth = 2;
            performanceSeries.stroke = am4core.color("red");

            var jointsSeries = chart.series.push(new am4charts.LineSeries());
            jointsSeries.dataFields.valueY = "joints";
            jointsSeries.dataFields.categoryX = "session";
            jointsSeries.name = "Joints";
            jointsSeries.strokeWidth = 2;
            jointsSeries.stroke = am4core.color("blue");

            chart.legend = new am4charts.Legend();
        }


        createRadarChart("performanceChart", performanceData);
        createRadarChart("jointsChart", jointsData);
        //createLineChart("summaryChart", dataAverage);
    });
}