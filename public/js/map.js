function Map(opts) {
    var self = this;
    if (!(this instanceof Map)) return new Map(opts);
    if (!opts) opts = {};

    self.width = opts.width || window.innerWidth;
    self.height = opts.height || window.innerHeight;
    self.zooms = opts.zooms || [500, 1000, 1500]
    self.zoomIndex = -1; // full view of map at launch

    // initialize map projection.
    // orthographic gives it a round projection
    self.projection = d3.geoOrthographic()
      .translate([self.width/2, self.height/3])
      .scale(self.width/2)
      .clipAngle(90)
      .precision(1);

    // make the globe a full sized one
    // using svg so that we don't have to redraw the map 
    // everytime it rotates
    self.svg = d3.select("#map-div").append("svg")
      .attr("fill", "#34495e") //#4796a5
      .attr("width", self.width)
      .attr("height", self.height)
}

/**
 * makes a map with borders and countries
 */
Map.prototype.render = function() {
    var self = this;
    d3.json("/world-50m.json", function(error, world) {
        self.land = topojson.feature(world, world.objects.land),
        self.svgLand = self.svg.append("path").datum(self.land).attr("d", self.path);
    });
}

/**
 * controlls zooming and rotating by interpolating
 * through svg data
 */
Map.prototype.step = function(position, callback) {
    var self = this;

    // return to default zoom if we're too deep
    if (++self.zoomIndex >= self.zooms.length) self.zoomIndex = 0; 

    d3.transition()
        .duration(2000)
        .tween("rotate", function() {
            var point = position,
                rotate = d3.interpolate(self.projection.rotate(), [-point[0], -point[1]]),
                scale = d3.interpolate(self.projection.scale(), (self.zooms[self.zoomIndex]/0.5));
            return function(t) {
                self.projection 
                    .rotate(rotate(t))
                    .scale(scale(t))
                self.svgLang.attr("d", self.path);
            };
        })
        .each("end", callback)
}

/**
 * Adds markers for geotagged instagram posts
 */
Map.prototype.drawMarker = function(position) {
    var circle = this.projection(position);

    this.svg.append("circle")
        .attr("cx", circle[0])
        .attr("cy", circle[1])
    
    //TODO: color should depend on continent
    d3.selectAll("circle")
        .style("opacity", 1)
        .attr("r", "0px")
        .transition()
        .duration(1500)
        .ease("linear")
        .attr("r", "200px")
        .attr("stroke", "#f2f2f2")
        .attr("stroke-width", "3px")
        .attr("fill", "none")
        .style("opacity", 0);
    
    this.svg.append("text")
        .attr("x", circle[0])
        .attr("y", circle[1])
        .attr("fill", "#d7d7d7")
        .attr("dy", "1em")
}

/**
 * Removes markers for a new search
 */
Map.prototype.removeMarker = function() {
    var circle = $("circle");
    $(circle).remove();
    $("location-display").addClass("hidden");
}

/**
 * Adds geotagged photo to map
 */
Map.prototype.addPicture = function(pictureUrl, postUrl) {
    var container = "<div><a href='" + postUrl + "' target='_blank'>" + "<img src='" + pictureUrl + "'/></a></div>";
    $("#posts-container").fadeOut("slow", function() {
        $(this).html(container).fadeIn("slow")
    });
}

/**
 * Adds new photo caption
 */
Map.prototype.replaceCaption = function(caption) {
    $("#captions-container").text(caption);
}

/**
 * Converts coordinates to a location string
 */
Map.prototype.getLocation = function(position) {
  var self = this;
  var geocoder = new google.maps.Geocoder();
  var latLng = new google.maps.LatLng(position[1], position[0]);

  geocoder.geocode({"latLng": latLng}, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      var text = self.parseLocation(results);
      self.showLocationText(text);
    }
  });
}

/**
 * Shows location data
 */
Map.prototype.showLocationText = function(text) {
  $("#location-display").text(text);
  $("#location-display").removeClass("hidden");
}

/**
 * returns the string representation of the location data
 */
Map.prototype.parseLocation = function(results) {
  var self = this;
  var locationComponents = [];
  for(var i = results.length - 1; locationComponents.length < 3; i--) {
    var addressComponents = results[i].address_components
    for(var j = 0; j < addressComponents.length; j++) {
      if(locationComponents.indexOf(addressComponents[j].long_name) === -1 && self.addressNotPostalCode(addressComponents[j])) {
        locationComponents.unshift(addressComponents[j].long_name)
      }
    }
  }
  return locationComponents.join(", ");
}

Map.prototype.addressNotPostalCode = function(addressComponent) {
  for(var i = 0; i < addressComponent.types.length; i++) {
    if (addressComponent.types[i] == "postal_code")
      return false;
  }
  return true;
}