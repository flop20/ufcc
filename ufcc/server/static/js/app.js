/**
 * ---------------------------------------
 * This app was created using amCharts 5.
 *
 * For more information visit:
 * https://www.amcharts.com/
 *
 * Documentation is available at:
 * https://www.amcharts.com/docs/v5/
 * ---------------------------------------
 */

var root = am5.Root.new("chartdiv");

const theme = am5.Theme.new(root);
theme.rule("Label").set("fontSize", 10);
theme.rule("Grid").set("strokeOpacity", 0.06);

root.setThemes([
    am5themes_Animated.new(root),
    theme
]);

root.fps = 60;

// Fetch the data from the backend
var obj = {
    "lipid": "",
    "protein": ""
}
fetch('/data/' + JSON.stringify(obj))
    .then(response => response.json())
    .then(responseData => {


        // console.log('responseData', responseData);
        var contactData = responseData['data'];
        var lipids = responseData['lipids'];
        var proteins = responseData['proteins'];

        var systemHasOneProtein = false;
        if (proteins.length == 1) {
            systemHasOneProtein = true
        }

        var startFrameGroup = 0;
        var endFrameGroup = 1;
        var currentFrameGroup = 1;

        var div = document.getElementById("chartdiv");

        var colorSet = am5.ColorSet.new(root, {});

        // Params
        var innerRadius = 20;

        // Create chart
        var chart = root.container.children.push(am5radar.RadarChart.new(root, {
            panX: false,
            panY: false,
            wheelX: "panX",
            wheelY: "zoomX",
            innerRadius: am5.percent(innerRadius),
            radius: am5.percent(65),
            startAngle: 270 - 170,
            endAngle: 270 + 170
            // Right handed half circle:
            // startAngle: -90,
            // endAngle: 90
        }));


        // Add cursor
        var cursor = chart.set("cursor", am5radar.RadarCursor.new(root, {
            behavior: "zoomX",
            radius: am5.percent(innerRadius),
            innerRadius: -25
        }));
        cursor.lineY.set("visible", true);
        cursor.lineY.set("opacity", 0.5);

        // Create axes and their renderers
        var xRenderer = am5radar.AxisRendererCircular.new(root, {
            minGridDistance: 10
        });

        xRenderer.labels.template.setAll({
            radius: 10,
            textType: "radial",
            centerY: am5.p50
        });

        var yRenderer = am5radar.AxisRendererRadial.new(root, {
            axisAngle: 90
        });

        yRenderer.labels.template.setAll({
            centerX: am5.p50
        });

        var categoryAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, {
            maxDeviation: 0,
            categoryField: "residue",
            renderer: xRenderer
        }));

        var valueAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, {
            min: 0,
            max: 4,
            extraMax: 0.1,
            renderer: yRenderer
        }));

        // Pie chart label
        var axisRange = categoryAxis.createAxisRange(categoryAxis.makeDataItem({
            above: true
        }));

        // Create series
        var series = chart.series.push(am5radar.RadarColumnSeries.new(root, {
            calculateAggregates: true,
            name: "Series",
            xAxis: categoryAxis,
            yAxis: valueAxis,
            valueYField: "value_" + currentFrameGroup,
            categoryXField: "residue",
            tooltip: am5.Tooltip.new(root, {
                labelText: "{categoryX}: {valueY}"
            })
        }));

        series.columns.template.set("strokeOpacity", 0);


        // Set up heat rules
        series.set("heatRules", [{
            target: series.columns.template,
            key: "fill",
            min: am5.color(0x673AB7),
            max: am5.color(0xF44336),
            dataField: "valueY"
        }]);

        // Add scrollbars
        // chart.set("scrollbarX", am5.Scrollbar.new(root, {
        //     orientation: "horizontal"
        // }));
        // chart.set("scrollbarY", am5.Scrollbar.new(root, {
        //     orientation: "vertical"
        // }));

        // Add frameGroup label
        // var frameGroupLabel = chart.radarContainer.children.push(am5.Label.new(root, {
        //     fontSize: "2em",
        //     text: currentFrameGroup.toString(),
        //     centerX: am5.p50,
        //     centerY: am5.p50,
        //     fill: am5.color(0x673AB7)
        // }));

        // Generate and set data
        var data = generateRadarData(contactData);
        series.data.setAll(data);
        categoryAxis.data.setAll(data);

        series.appear(500);
        chart.appear(500, 100);

        function generateRadarData(contactData) {
            // contactData = contactData['Protein0']
            var data = [];
            var i = 0;
            for (var lipid in contactData) {
                var lipidData = contactData[lipid];

                lipidData.forEach(function (residue) {
                    var rawDataItem = {
                        "residue": residue[0]
                    }

                    var startY = 1
                    for (var y = startY; y < residue.length; y++) {
                        rawDataItem["value_" + (startFrameGroup + y - startY)] = residue[y];
                    }
                    // rawDataItem['protein'] = "GIRK"
                    data.push(rawDataItem);
                });

                createRange(lipid, lipidData, i);
                i++;

            }
            return data;
        }


        function createRange(name, lipidData, index) {
            axisRange.get("label").setAll({
                text: name
            });
            // first residue
            axisRange.set("category", lipidData[0][0]);
            // last residue
            axisRange.set("endCategory", lipidData[lipidData.length - 1][0]);

            // every 3rd color for a bigger contrast
            var fill = axisRange.get("axisFill");
            fill.setAll({
                toggleKey: "active",
                cursorOverStyle: "pointer",
                fill: colorSet.getIndex(index * 3),
                // fill: colorSet.getIndex(3),
                visible: true,
                innerRadius: -25
            });
            axisRange.get("grid").set("visible", false);

            var label = axisRange.get("label");
            label.setAll({
                fill: am5.color(0xffffff),
                textType: "circular",
                visible: true,
                radius: -16
            });

            fill.events.on("click", function (event) {
                var dataItem = event.target.dataItem;
                if (event.target.get("active")) {
                    categoryAxis.zoom(0, 1);
                } else {
                    categoryAxis.zoomToCategories(dataItem.get("category"), dataItem.get("endCategory"));
                }
            });
        }


        // Create controls
        var container = chart.children.push(am5.Container.new(root, {
            y: am5.percent(95),
            centerX: am5.p50,
            x: am5.p50,
            width: am5.percent(40),
            layout: root.horizontalLayout
        }));

        var playButton = container.children.push(am5.Button.new(root, {
            themeTags: ["play"],
            visible: false,
            centerY: am5.p50,
            marginRight: 15,
            icon: am5.Graphics.new(root, {
                themeTags: ["icon"]
            })
        }));

        playButton.events.on("click", function () {
            if (playButton.get("active")) {
                slider.set("start", slider.get("start") + 0.0001);
            } else {
                slider.animate({
                    key: "start",
                    to: 1,
                    duration: 15000 * (1 - slider.get("start"))
                });
            }
        })

        var slider = container.children.push(am5.Slider.new(root, {
            orientation: "horizontal",
            visible: false,
            start: 0.0,
            centerY: am5.p50
        }));

        slider.on("start", function (start) {
            if (start === 1) {
                playButton.set("active", false);
            }
        });

        slider.events.on("rangechanged", function () {
            // val = Math.round(slider.get("start", 0) * (endFrameGroup - startFrameGroup));
            // val = slider.get("start", 0) //* (endFrameGroup - startFrameGroup)
            // console.log('before UPDATE')
            updateRadarData(startFrameGroup + Math.round(slider.get("start", 0) * (endFrameGroup - startFrameGroup)));
        });

        function updateRadarData(frameGroup) {
            if (currentFrameGroup != frameGroup) {
                currentFrameGroup = frameGroup;
                // frameGroupLabel.set("text", currentFrameGroup.toString());
                am5.array.each(series.dataItems, function (dataItem) {
                    var newValue = dataItem.dataContext["value_" + frameGroup];
                    dataItem.set("valueY", newValue);
                    dataItem.animate({
                        key: "valueYWorking",
                        to: newValue,
                        duration: 500
                    });
                });
            }
        }

        var pieRoot = am5.Root.new("chartdiv2");

        // Set themes
        pieRoot.setThemes([am5themes_Animated.new(pieRoot)]);

        var pieContainer = pieRoot.container.children.push(
            am5.Container.new(pieRoot, {
              width: am5.p100,
              height: am5.p100,
              layout: pieRoot.horizontalLayout
            })
          );

          // Create main chart
          var pieChart = pieContainer.children.push(
            am5percent.PieChart.new(pieRoot, {
              tooltip: am5.Tooltip.new(pieRoot, {})
            })
          );

          // Create series
          var pieSeries = pieChart.series.push(
            am5percent.PieSeries.new(pieRoot, {
              valueField: "value",
              categoryField: "category",
              alignLabels: false
            })
          );

          pieSeries.labels.template.setAll({
            textType: "circular",
            radius: 4
          });
          pieSeries.ticks.template.set("visible", false);
          pieSeries.slices.template.set("toggleKey", "none");

          // add events
          pieSeries.slices.template.events.on("click", function(e) {
            selectSlice(e.target);

            console.log('series', series)

            // TODO:
            // only execute when the protein changes
            var protein = e.target.dataItem.dataContext.category
            var lipid = subSeries.slices.getIndex(0).dataItem.dataContext.category

            obj.lipid = lipid
            obj.protein = protein
            fetch('/data/' + JSON.stringify(obj))
                .then(response => response.json())
                .then(responseData => {

                    updateData = responseData['data']
                    var updateData = generateRadarData(updateData);
                    series.data.setAll(updateData);
                    // categoryAxis.data.setAll(updateData);

                    am5.array.each(series.dataItems, function (dataItem) {
                        var newValue = dataItem.dataContext["value_" + 0];
                        dataItem.set("valueY", newValue);
                        dataItem.animate({
                            key: "valueYWorking",
                            to: newValue,
                            duration: 0
                        });
                    });
                });
            series.appear(1000);
            // chart.appear(500, 100);

          });

          // Create sub chart
          var subChart = pieContainer.children.push(
            am5percent.PieChart.new(pieRoot, {
              radius: am5.percent(50),
              tooltip: am5.Tooltip.new(pieRoot, {})
            })
          );

          // Create sub series
          var subSeries = subChart.series.push(
            am5percent.PieSeries.new(pieRoot, {
              valueField: "value",
              categoryField: "category",
              alignLabels: false
            })
          );

          // subSeries click event to link to radar chart
          subSeries.slices.template.events.on("click", function(e) {

            var lipid = e.target.dataItem.dataContext.category
            if (lipid != axisRange.get("label").get('text')) {
                obj.lipid = lipid
                // TODO:
                // get correct protein
                obj.protein = "GIRK"
                fetch('/data/' + JSON.stringify(obj))
                    .then(response => response.json())
                    .then(responseData => {

                        updateData = responseData['data']

                        var updateData = generateRadarData(updateData);
                        series.data.setAll(updateData);
                        // categoryAxis.data.setAll(updateData);

                        am5.array.each(series.dataItems, function (dataItem) {
                            var newValue = dataItem.dataContext["value_" + 0];
                            dataItem.set("valueY", newValue);
                            dataItem.animate({
                                key: "valueYWorking",
                                to: newValue,
                                duration: 0
                            });
                        });
                    });
                series.appear(1000);
                // chart.appear(500, 100);
            }
          });

          subSeries.data.setAll(lipids.map(lipidName => ({category: lipidName, value: 0})))
        //   subSeries.data.setAll([
        //     { category: "CHOL", value: 0 },
        //     { category: "POPE", value: 0 },
        //     { category: "POPS", value: 0 },
        //   ]);
            subSeries.labels.template.setAll({
                textType: "circular",
                radius: 4
            });
            subSeries.ticks.template.set("visible", false);
            subSeries.slices.template.set("toggleKey", "none");

          var selectedSlice;

          pieSeries.on("startAngle", function() {
            updateLines();
          });

        //   pieContainer.events.on("boundschanged", function() {
        //     pieRoot.events.on("frameended", function(){
        //       updateLines();
        //      })
        //   })

          function updateLines() {
            if (selectedSlice) {
              var startAngle = selectedSlice.get("startAngle");
              var arc = selectedSlice.get("arc");
              var radius = selectedSlice.get("radius");

              if (!systemHasOneProtein) {
                var x00 = radius * am5.math.cos(startAngle);
                var y00 = radius * am5.math.sin(startAngle);

                var x10 = radius * am5.math.cos(startAngle + arc);
                var y10 = radius * am5.math.sin(startAngle + arc);

              } else {
                var x00 = radius * am5.math.sin(startAngle);
                var y00 = radius * am5.math.cos(startAngle);

                var x10 = radius * am5.math.sin(startAngle + arc);
                var y10 = -radius * am5.math.cos(startAngle + arc);

              }

              var subRadius = subSeries.slices.getIndex(0).get("radius");
              var x01 = 0;
              var y01 = -subRadius;

              var x11 = 0;
              var y11 = subRadius;

              var point00 = pieSeries.toGlobal({ x: x00, y: y00 });
              var point10 = pieSeries.toGlobal({ x: x10, y: y10 });

              var point01 = subSeries.toGlobal({ x: x01, y: y01 });
              var point11 = subSeries.toGlobal({ x: x11, y: y11 });

              line0.set("points", [point00, point01]);
              line1.set("points", [point10, point11]);
            }
          }




          // lines
          var line0 = pieContainer.children.push(
            am5.Line.new(pieRoot, {
              position: "absolute",
              stroke: pieRoot.interfaceColors.get("text"),
              strokeDasharray: [2, 2]
            })
          );
          var line1 = pieContainer.children.push(
            am5.Line.new(pieRoot, {
              position: "absolute",
              stroke: pieRoot.interfaceColors.get("text"),
              strokeDasharray: [2, 2]
            })
          );

          // Set data
          pieSeries.data.setAll(responseData['pieData']);

          function selectSlice(slice) {
            selectedSlice = slice;
            var dataItem = slice.dataItem;
            var dataContext = dataItem.dataContext;

            if (dataContext) {
              var i = 0;
              subSeries.data.each(function(dataObject) {
                var dataObj = dataContext.subData[i];
                if(dataObj){
                    subSeries.data.setIndex(i, dataObj);
                    if(!subSeries.dataItems[i].get("visible")){
                        subSeries.dataItems[i].show();
                    }
                }
                else{
                    subSeries.dataItems[i].hide();
                }

                i++;
              });
            }

            var middleAngle = slice.get("startAngle") + slice.get("arc") / 2;
            var firstAngle = pieSeries.dataItems[0].get("slice").get("startAngle");

            pieSeries.animate({
              key: "startAngle",
              to: firstAngle - middleAngle,
              duration: 1000,
              easing: am5.ease.out(am5.ease.cubic)
            });
            pieSeries.animate({
              key: "endAngle",
              to: firstAngle - middleAngle + 360,
              duration: 1000,
              easing: am5.ease.out(am5.ease.cubic)
            });
          }

          pieContainer.appear(1000, 10);

          pieSeries.events.on("datavalidated", function() {
            selectSlice(pieSeries.slices.getIndex(0));
          });



          var ganttRoot = am5.Root.new("chartdiv3");
        //   ganttRoot.dateFormatter.setAll({
        //     // dateFormat: "yyyy-MM-dd",
        //     valueField: ["valueX", "openValueX"]
        //   });


          // Set themes
          // https://www.amcharts.com/docs/v5/concepts/themes/
          ganttRoot.setThemes([
            am5themes_Animated.new(ganttRoot)
          ]);


          // Create chart
          // https://www.amcharts.com/docs/v5/charts/xy-chart/
          var ganttChart = ganttRoot.container.children.push(am5xy.XYChart.new(ganttRoot, {
            panX: false,
            panY: false,
            wheelX: "panX",
            wheelY: "zoomX",
            layout: ganttRoot.verticalLayout
          }));

          var legend = ganttChart.children.push(am5.Legend.new(ganttRoot, {
            centerX: am5.p50,
            x: am5.p50
          }))

          var colors = ganttChart.get("colors");

          // Data
          var data = [
            {
              category: "John",
              fromDate: 0,
              toDate: 10,
              columnSettings: {
                fill: am5.Color.brighten(colors.getIndex(0), 0)
              }
            },
            {
              category: "John",
              fromDate: 45,
              toDate: 75,
              columnSettings: {
                fill: am5.Color.brighten(colors.getIndex(0), 0.4)
              }
            },
            {
              category: "John",
              fromDate: 90,
              toDate: 100,
              columnSettings: {
                fill: am5.Color.brighten(colors.getIndex(0), 0.8)
              }
            },

            {
              category: "Jane",
              fromDate: 10,
              toDate: 35,
              columnSettings: {
                fill: am5.Color.brighten(colors.getIndex(2), 0)
              }
            },
            {
              category: "Jane",
              fromDate: 45,
              toDate: 60,
              columnSettings: {
                fill: am5.Color.brighten(colors.getIndex(2), 0.4)
              }
            },

            {
              category: "Peter",
              fromDate: 20,
              toDate: 35,
              columnSettings: {
                fill: am5.Color.brighten(colors.getIndex(4), 0)
              }
            },
            {
              category: "Peter",
              fromDate: 35,
              toDate: 80,
              columnSettings: {
                fill: am5.Color.brighten(colors.getIndex(4), 0.4)
              }
            },

            {
              category: "Melania",
              fromDate: 77,
              toDate: 88,
              columnSettings: {
                fill: am5.Color.brighten(colors.getIndex(6), 0)
              }
            },
            {
              category: "Melania",
              fromDate: 89,
              toDate: 94,
              columnSettings: {
                fill: am5.Color.brighten(colors.getIndex(6), 0.4)
              }
            },

            {
              category: "Donald",
              fromDate: 34,
              toDate: 88,
              columnSettings: {
                fill: am5.Color.brighten(colors.getIndex(8), 0)
              }
            }
          ];

          // Create axes
          // https://www.amcharts.com/docs/v5/charts/xy-chart/axes/
          var ganttYAxis = ganttChart.yAxes.push(
            am5xy.CategoryAxis.new(ganttRoot, {
              categoryField: "category",
              renderer: am5xy.AxisRendererY.new(ganttRoot, { inversed: true }),
              tooltip: am5.Tooltip.new(ganttRoot, {
                themeTags: ["axis"],
                animationDuration: 200
              })
            })
          );

          ganttYAxis.data.setAll([
            { category: "John" },
            { category: "Jane" },
            { category: "Peter" },
            { category: "Melania" },
            { category: "Donald" }
          ]);

        //   var ganttXAxis = ganttChart.xAxes.push(
        //     am5xy.DateAxis.new(ganttRoot, {
        //       baseInterval: { timeUnit: "second", count: 1 },
        //       renderer: am5xy.AxisRendererX.new(ganttRoot, {})
        //     })
        //   );

          var ganttXAxis = ganttChart.xAxes.push(am5xy.ValueAxis.new(ganttRoot, {
            min: 0,
            max: 100,
            // extraMax: 1,
            renderer: am5xy.AxisRendererX.new(ganttRoot, {})
        }));

          // Add series
          // https://www.amcharts.com/docs/v5/charts/xy-chart/series/
        //   var ganttSeries = ganttChart.series.push(am5xy.ColumnSeries.new(ganttRoot, {
        //     xAxis: ganttXAxis,
        //     yAxis: ganttYAxis,
        //     openValueXField: "fromDate",
        //     valueXField: "toDate",
        //     categoryYField: "category",
        //     sequencedInterpolation: true
        //   }));
          var ganttSeries = ganttChart.series.push(am5xy.ColumnSeries.new(ganttRoot, {
            xAxis: ganttXAxis,
            yAxis: ganttYAxis,
            openValueXField: "fromDate",
            valueXField: "toDate",
            categoryYField: "category",
            sequencedInterpolation: true
          }));

          ganttSeries.columns.template.setAll({
            templateField: "columnSettings",
            strokeOpacity: 0,
            tooltipText: "{category}"
          });

        //   ganttSeries.data.processor = am5.DataProcessor.new(ganttRoot, {
        //     valueField: ["fromDate", "toDate"],
        //     // dateFormat: "yyyy-MM-dd HH:mm"
        //   });
          ganttSeries.data.setAll(data);

          // Add scrollbars
        //   ganttChart.set("scrollbarX", am5.Scrollbar.new(ganttRoot, {
        //     orientation: "horizontal"
        //   }));

          // Make stuff animate on load
          // https://www.amcharts.com/docs/v5/concepts/animations/
          ganttSeries.appear();
          ganttChart.appear(1000, 100);






    });