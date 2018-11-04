var map;
var defaultIcon;
var highlightedIcon;

function googleError() {
    $('#query-summary').text("Could not load Google Maps");
    $('#list').hide();
}

//function to initialize map
function initMap() {
    "use strict";

    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat:  28.613939, lng: 77.209021},
        zoom: 13,
        mapTypeControl: false
    });
    ko.applyBindings(new AppViewModel());

}

String.prototype.contains = function (other) {
    return this.indexOf(other) !== -1;
};

//Knockout's View Model
var AppViewModel = function () {
    var self = this;

    function initialize() {
        fetchrestaurants();
    }


    if (typeof google !== 'object' || typeof google.maps !== 'object') {
    } else {
        defaultIcon = makeMarkerIcon('FF0000');
        highlightedIcon = makeMarkerIcon('00FFF0');
        var infoWindow = new google.maps.InfoWindow();
        google.maps.event.addDomListener(window, 'load', initialize);
    }
    self.restaurantList = ko.observableArray([]);
    self.query = ko.observable('');
    self.queryResult = ko.observable('');

    self.search = function () {
        //To prevent reload of page on click search button
    };


    //List of restaurant's after filter based on query added in search
    self.FilteredrestaurantList = ko.computed(function () {
        self.restaurantList().forEach(function (restaurant) {
            restaurant.marker.setMap(null);
        });

        var results = ko.utils.arrayFilter(self.restaurantList(), function (restaurant) {
            return restaurant.name().toLowerCase().contains(self.query().toLowerCase());
        });

        results.forEach(function (restaurant) {
            restaurant.marker.setMap(map);
        });
        if (results.length > 0) {
            if (results.length == 1) {
                self.queryResult(results.length + " restaurant's from Foursquare ");
            } else {
                self.queryResult(results.length + " restaurant's from Foursquare ");
            }
        }
        else {
            self.queryResult("No restaurant's Available");
        }
        return results;
    });
    self.queryResult("Loading restaurants, Please wait...");

    //function called when a restaurant is clicked from the filtered list
    self.selectrestaurant = function (restaurant) {
        infoWindow.setContent(restaurant.formattedInfoWindowData());
        infoWindow.open(map, restaurant.marker);
        map.panTo(restaurant.marker.position);
        restaurant.marker.setAnimation(google.maps.Animation.BOUNCE);
        restaurant.marker.setIcon(highlightedIcon);
        self.restaurantList().forEach(function (unselected_restaurant) {
            if (restaurant != unselected_restaurant) {
                unselected_restaurant.marker.setAnimation(null);
                unselected_restaurant.marker.setIcon(defaultIcon);
            }
        });
    };

    //function to fetch restaurants in New Delhi
    function fetchrestaurants() {
        var data;

        $.ajax({
            url: 'https://api.foursquare.com/v2/venues/search',
            dataType: 'json',
            data: 'client_id=NCJY1BX01WUCHV4ZBVXBW030NOOKEHWESQ4BHJ0FBLC2YIST&client_secret=UBYB4I4XGEUOKP5OARK01HGX4UZGEVNO0AQ0A4J1H22V5XMH&v=20130815%20&ll=28.613939,77.209021%20&query=restaurant',
            async: true,
        }).done(function (response) {
            data = response.response.venues;
            data.forEach(function (restaurant) {
                foursquare = new Foursquare(restaurant, map);
                self.restaurantList.push(foursquare);
            });
            self.restaurantList().forEach(function (restaurant) {
                if (restaurant.map_location()) {
                    google.maps.event.addListener(restaurant.marker, 'click', function () {
                        self.selectrestaurant(restaurant);
                    });
                }
            });
        }).fail(function (response, status, error) {
            $('#query-summary').text('restaurant\'s could not load...');
        });
    }
};

//function to make default and highlighted marker icon
function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
        'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
        '|40|_|%E2%80%A2',
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34),
        new google.maps.Size(21, 34));
    return markerImage;
}

//Foursquare model
var Foursquare = function (restaurant, map) {
    var self = this;
    self.name = ko.observable(restaurant.name);
    self.location = restaurant.location;
    self.lat = self.location.lat;
    self.lng = self.location.lng;
    //map_location returns a computed observable of latitude and longitude
    self.map_location = ko.computed(function () {
        if (self.lat === 0 || self.lon === 0) {
            return null;
        } else {
            return new google.maps.LatLng(self.lat, self.lng);
        }
    });
    self.formattedAddress = ko.observable(self.location.formattedAddress);
    self.formattedPhone = ko.observable(restaurant.contact.formattedPhone);
    self.marker = (function (restaurant) {
        var marker;

        if (restaurant.map_location()) {
            marker = new google.maps.Marker({
                position: restaurant.map_location(),
                map: map,
                icon: defaultIcon
            });
        }
        return marker;
    })(self);
    self.id = ko.observable(restaurant.id);
    self.url = ko.observable(restaurant.url);
    self.formattedInfoWindowData = function () {
        return '<div class="info-window-content">' + '<a href="' + (self.url()===undefined?'/':self.url()) + '">' +
            '<span class="info-window-header"><h4>' + (self.name()===undefined?'restaurant name not available':self.name()) + '</h4></span>' +
            '</a><h6>' + (self.formattedAddress()===undefined?'No address available':self.formattedAddress())  + '<br>' + (self.formattedPhone()===undefined?'No Contact Info':self.formattedPhone()) + '</h6>' +
            '</div>';
    };
};

