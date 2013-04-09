window.onload = function () {

  var tdy = new Date();
  var dm10 = new Date( new Date(tdy).setDate(tdy.getDate() - 2) );
  var dp10 = new Date( new Date(tdy).setDate(tdy.getDate() + 2) );

  loadData(dm10, dp10, 'north');
}


function loadData(dm10, dp10, hemi_choice) {
      
  $('.data').fadeOut('slow');
  $('#loading').fadeIn('fast');

  d3.xhr("/dbq?sdt="+dm10+"&edt="+dp10
      , "application/json"
      , function(error, xhrRes) {

      if (!error) {
          var data = JSON.parse(xhrRes.response);
      } else {
          console.log(error);
      }

      datA = data.filter( function(d) {
          if (d.scraft=='a') {
              d.time = new Date(d.time);
              d.L = +d.L;
              return d
          }
      });

      datB = data.filter( function(d) {
          if (d.scraft=='b') {
              d.time = new Date(d.time);
              d.L = +d.L;
              return d
          }
      });

      plotData(datA, datB, hemi_choice);

      $('#loading').fadeOut('fast');

      dm10 = dm10.getFullYear()+' / '+(dm10.getUTCMonth()+1)+' / '+dm10.getUTCDate();
      dp10 = dp10.getFullYear()+' / '+(dp10.getUTCMonth()+1)+' / '+dp10.getUTCDate();
      $('#dt').html(dm10+"  -to-  "+dp10);

      $('.data').fadeIn('fast', function() {
          $(this).animate({fontSize: "20px"}, 
          'fast', 'linear', function(){
            $(this).animate({fontSize: "14px"}, 'fast');
          })
      });
  });

}


function plotData(datA, datB, hemi) {

  if (!hemi) {
    var hemi = $(".tabnav-tabs .selected").attr("id");
  } else {
    $("#"+hemi).addClass("selected");
  }
  var width = $(".content").width()*0.95,
      height = $(window).height()*0.8,
      height2 = height*0.1;

  $(".tabnav-tabs li").unbind("click");
  $(".tabnav-tabs li").on("click", changeHemi);
  $(".dtnav").unbind("click")
  $(".dtnav").on("click", changeData);

//*********************************************
//Time series
//*********************************************

  var x = d3.time.scale().range([0, width]),
      y = d3.scale.linear().range([height2, 0]);

  var brush = d3.svg.brush()
      .x(x)
      .on("brush", brushed)
      .on("brushstart", brushdown)
      .on("brushend", brushdown);

  d3.select(".times").selectAll("svg").remove();
  var svgts = d3.select(".times").append("svg")
      .attr("id", "svgts")
      .attr("width", width)
      .attr("height", height2);

  svgts.append("defs").append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", width)
      .attr("height", height2);

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");
  var yAxis = d3.svg.axis()
      .scale(y)
      .ticks(3)
      .orient("left");

  var area = d3.svg.area()
      .interpolate("monotone")
      .x(function(d) { return x(d.time); })
      .y0(height2)
      .y1(function(d) { return y(d.L); });

  var parseDate = d3.time.format("%b %Y").parse;
  var context = svgts.append("g");

  x.domain(d3.extent(datA.map(function(d) { return d.time; })));
  y.domain([0, 7]);
  var sx = new Date( (x.domain()[0]) );
  var ex = new Date( (x.domain()[1]) );
  now = new Date(sx.valueOf() + (ex.valueOf() - sx.valueOf())/2);
  st = new Date( new Date(now).setHours(now.getHours() - 12) );
  et = new Date( new Date(now).setHours(now.getHours() + 12) );
  brush.extent([st, et]);

  context.append("path")
      .datum(datA)
      .attr("d", area)
      .attr("class", "area-scraftA");

  context.append("path")
      .datum(datB)
      .attr("d", area)
      .attr("class", "area-scraftB");

  context.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height2 + ")")
      .call(xAxis);

  context.append("g")
    .attr("class", "y axis")
    .call(yAxis)
  .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("L-shell");

  context.append("g")
      .attr("class", "x brush")
      .call(brush)
    .selectAll("rect")
      .attr("y", -6)
      .attr("height", height2 + 7);


//*********************************************
//Map
//*********************************************

  var λ = d3.scale.linear()
    .domain([0, width])
    .range([-180, 180]);

  var φ = d3.scale.linear()
      .domain([0, height])
      .range([90, -90]);

  var rot = ((hemi=='north') ? -90 : 90);
  var projection = d3.geo.orthographic()
      .scale(height*0.5)
      .translate([width / 2, height / 2])
      .clipAngle(90)
      .rotate([0, rot])
      .precision(.1);
      
  var path = d3.geo.path()
      .projection(projection);

  var graticule = d3.geo.graticule();

  d3.select(".map").selectAll("svg").remove();
  var svg = d3.select(".map").append("svg")
      .attr("width", width)
      .attr("height", height);

  svg.append("defs").append("path")
      .datum({type: "Sphere"})
      .attr("id", "sphere")
      .attr("d", path);

  svg.append("use")
      .attr("class", "stroke")
      .attr("xlink:href", "#sphere");

  svg.append("use")
      .attr("class", "fill")
      .attr("xlink:href", "#sphere");

  svg.append("path")
      .datum(graticule)
      .attr("class", "graticule")
      .attr("d", path);

  d3.json("geo/world-110m.json", function(error, world) {
    svg.insert("path", ".graticule")
        .datum(topojson.object(world, world.objects.land))
        .attr("class", "land")
        .attr("d", path);

    svg.insert("path", ".graticule")
        .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
        .attr("class", "boundary")
        .attr("d", path);
  });

  var circlesA = svg.append("svg:g")
      .attr("id", "circles")
      .attr("class", "circles-scraftA");

  updateFps(circlesA, datA, hemi);

  var circlesB = svg.append("svg:g")
      .attr("id", "circles")
      .attr("class", "circles-scraftB");

  updateFps(circlesB, datB, hemi);

  brushS = svg.append("svg:g")
      .append("text")
      .attr("class", "area-scraftA")
      .attr("x", 10)
      .attr("y", 20)
      .style("text-anchor", "start")
      .text('probe A');
  brushE = svg.append("svg:g")
      .append("text")
      .attr("class", "area-scraftB")
      .attr("x", 10)
      .attr("y", 40)
      .style("text-anchor", "start")
      .text('probe B');

  d3.select(self.frameElement).style("height", height + "px");


//*********************************************
//Callbacks
//*********************************************
  function brushed() {
      var st = new Date(brush.extent()[0]);
      var et = new Date(brush.extent()[1]);
      var dt = et.getHours() - st.getHours();
      dt += 24*Math.abs( st.getDate() - et.getDate() );
      dt += 24*30*Math.abs( st.getMonth() - et.getMonth() );

      if (dt > 24) {
          var ppos = new Date(x.invert(d3.mouse(this)[0]));
          if (ppos >= et) {
              st = new Date( new Date(et).setHours(et.getHours() - 24) );
          } else if (ppos <= st) {
              et = new Date( new Date(st).setHours(st.getHours() + 24) );
          }
          brush.extent([st, et]);
      }
      updateFps(circlesA, datA, hemi, remove=true);
      updateFps(circlesB, datB, hemi, remove=true);
      brush(context);
  }


  function brushdown() {
      if (brush.empty()) {
          pos = d3.mouse(this);
          var bstart = new Date(x.invert(pos[0]));
          var st = new Date( new Date(bstart).setHours(bstart.getHours() - 12) );
          var et = new Date( new Date(bstart).setHours(bstart.getHours() + 12) );
          brush.extent([st, et]);
      }
      updateFps(circlesA, datA, hemi, remove=true);
      updateFps(circlesB, datB, hemi, remove=true);
      brush(context); 
  }


  function updateFps(circles, data, remove) {
    var pos = [];
    var fps = data.filter(function(d) {
        if (d.time >= brush.extent()[0] && d.time <= brush.extent()[1]) {
          pos.push( projection([+d.lonNH, +d.latNH]) );
          return true;
        }
    });
    $('.data .hover').text("");
    if (remove) {
      circles.selectAll("circle")
        .remove()
    }

    circles.selectAll("circle")
        .data(fps)
      .enter().append("svg:circle")
        .attr("cx", function(d, i) { return pos[i][0]; })
        .attr("cy", function(d, i) { return pos[i][1]; })
        .attr("r", function(d, i) { return 2; })
        .on("mouseover", function(d, i) { 
            d3.select(".hover").text(new Date(d.time).toUTCString()); 
            $('circle').attr('class', '');
            var sel = $(this);
            var parent = sel.parent();
            sel.attr('class', 'selected');
            sel.detach();
            parent.append(sel);
          });
  }


  function changeHemi(event) {
      $('.data .hover').text("");
      hemi = $(this).attr("id");

      $(".tabnav-tabs .selected").removeClass();
      $("#"+hemi).addClass("selected");

      if (hemi == 'north') {
          projection.rotate([0, -90]);
          svg.selectAll("path").attr("d", path);
          updateFps(circlesA, datA, hemi, remove=true);
          updateFps(circlesB, datB, hemi, remove=true);
      } else if (hemi == 'south') {
          projection.rotate([0, 90]);
          svg.selectAll("path").attr("d", path);
          updateFps(circlesA, datA, hemi, remove=true);
          updateFps(circlesB, datB, hemi, remove=true);
      }
  }


  function changeData(event) {
      var shift, add;
      var elem = $(this).attr("id");
      if (elem=="back") {
        shift = -4;
        add = 0;
      } else if (elem=="addback1") {
        shift = 0;
        add = -1;
      } else if (elem=="next") {
        shift = 4;
        add = 0;
      } else if (elem=="addnext1") {
        shift = 0;
        add = 1;
      }

      var st = new Date( (x.domain()[0]) );
      var et = new Date( (x.domain()[1]) );

      if (add>0) {
        et = new Date(et.setDate(et.getDate() + add));
      } else if (add<0){
        st = new Date(st.setDate(st.getDate() + add));
      }

      if (shift!=0) {
        et = new Date(et.setDate(et.getDate() + shift));
        st = new Date(st.setDate(st.getDate() + shift));
      }

      $('.data .hover').text("");
      loadData(st, et, hemi);

  }
}


function toogleVisibility(objSel) {
  var obj = $(objSel);
  var disp = obj.css("display")
  if (disp=="none" || !disp) {
    obj.fadeIn('slow');
  } else {
    obj.fadeOut('slow');
  }
}





