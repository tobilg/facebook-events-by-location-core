"use strict";

var rp = require("axios");

var EventSearch = function (options) {

    var self = this;

    self.allowedSorts = ["time", "distance", "venueDistance", "eventDistance", "venue", "popularity"];
    self.allowedCategories = ["ARTS_ENTERTAINMENT", "EDUCATION", "FITNESS_RECREATION", "FOOD_BEVERAGE", "HOTEL_LODGING", "MEDICAL_HEALTH", "SHOPPING_RETAIL", "TRAVEL_TRANSPORTATION"];
    self.accessToken = (process.env.FEBL_ACCESS_TOKEN && process.env.FEBL_ACCESS_TOKEN !== "" ? process.env.FEBL_ACCESS_TOKEN : null);

};

EventSearch.prototype.calculateStarttimeDifference = function (currentTime, dataString) {
    return (new Date(dataString).getTime()-(currentTime*1000))/1000;
};

EventSearch.prototype.compareVenue = function (a,b) {
    if (a.venue.name < b.venue.name)
        return -1;
    if (a.venue.name > b.venue.name)
        return 1;
    return 0;
};

EventSearch.prototype.compareTimeFromNow = function (a,b) {
    if (a.timeFromNow < b.timeFromNow)
        return -1;
    if (a.timeFromNow > b.timeFromNow)
        return 1;
    return 0;
};

EventSearch.prototype.compareVenueDistance = function (a,b) {
    var aEventDistInt = parseInt(a.distances.venue, 10);
    var bEventDistInt = parseInt(b.distances.venue, 10);
    if (aEventDistInt < bEventDistInt)
        return -1;
    if (aEventDistInt > bEventDistInt)
        return 1;
    return 0;
};

EventSearch.prototype.compareEventDistance = function (a,b) {
    var aEventDistInt = parseInt(a.distances.event, 10);
    var bEventDistInt = parseInt(b.distances.event, 10);
    if (aEventDistInt < bEventDistInt)
        return -1;
    if (aEventDistInt > bEventDistInt)
        return 1;
    return 0;
};

EventSearch.prototype.comparePopularity = function (a,b) {
    if ((a.stats.attending + (a.stats.maybe / 2)) < (b.stats.attending + (b.stats.maybe / 2)))
        return 1;
    if ((a.stats.attending + (a.stats.maybe / 2)) > (b.stats.attending + (b.stats.maybe / 2)))
        return -1;
    return 0;
};

EventSearch.prototype.haversineDistance = function (coords1, coords2, isMiles) {

    //coordinate is [latitude, longitude]
    function toRad(x) {
        return x * Math.PI / 180;
    }

    var lon1 = coords1[1];
    var lat1 = coords1[0];

    var lon2 = coords2[1];
    var lat2 = coords2[0];

    var R = 6371; // km

    var x1 = lat2 - lat1;
    var dLat = toRad(x1);
    var x2 = lon2 - lon1;
    var dLon = toRad(x2);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;

    if(isMiles) d /= 1.60934;

    return d;

};

EventSearch.prototype.search = function (options) {

    var self = this,
        queryOptions = {};

    queryOptions.limit = options.limit || 100;
    queryOptions.latitude = options.lat || null;
    queryOptions.longitude = options.lng || null;
    queryOptions.distance = options.distance || 100;
    queryOptions.accessToken = options.accessToken ? options.accessToken : self.accessToken;
    queryOptions.query = options.query ? encodeURIComponent(options.query) : "";
    queryOptions.categories = options.categories ? validateCategories(options.categories) : [];
    queryOptions.sort = options.sort || null;
    queryOptions.version = options.version ? options.version : "v2.10";
    queryOptions.since = options.since || (new Date().getTime()/1000).toFixed();
    queryOptions.until = options.until || null;
    queryOptions.showActiveOnly = options.showActiveOnly || true;

    function validateCategories (categories) {
        var validCategories = [];
        if (Array.isArray(categories) && categories.length > 0) {
            categories.forEach(function (category) {
                if (self.allowedCategories.indexOf(category.toUpperCase()) > -1) {
                    validCategories.push(category);
                }
            });
        }
        return validCategories;
    }

    function getPlaces(url) {
        var results;
        var temp;

        function getPlacesPaging(first, url, after) {
            var tempurl;
            if (after !== "") {
                tempurl = url + "&after=" + after;
            } else {
                tempurl = url;
            }
            return rp.get(tempurl).then(function success(responseBody) {
                if (responseBody.data && responseBody.data.data) {
                    responseBody.data = responseBody.data.data
                } else {
                    responseBody.data = [];
                }
                temp = responseBody;
                if (first) {
                    results = temp;
                } else {
                    temp.data.forEach(function (item) {
                        results.data.push(item);
                    })
                }
                if (temp.paging && temp.paging.cursors && temp.paging.cursors.after) {
                    return getPlacesPaging(false, url, temp.paging.cursors.after);
                } else {
                    return results;
                }
            })
        }
        return getPlacesPaging(true, url, "");
    }

    function createEventObject(venue, event, currentTimestamp) {

        var eventResultObj = {};
        var categoryList = null;
        if (venue.category_list && Array.isArray(venue.category_list)) {
            categoryList = [];
            venue.category_list.forEach(function (categoryObj) {
                if (categoryObj.name) {
                    categoryList.push(categoryObj.name);
                }
            });
        }
        var venueDistance = (venue.location && venue.location.latitude && venue.location.longitude ? parseInt((self.haversineDistance([venue.location.latitude, venue.location.longitude], [queryOptions.latitude, queryOptions.longitude], false)*1000).toFixed()) : null);
        eventResultObj.id = event.id;
        eventResultObj.name = event.name;
        eventResultObj.type = event.type;
        eventResultObj.coverPicture = (event.cover ? event.cover.source : null);
        eventResultObj.profilePicture = (event.picture ? event.picture.data.url : null);
        eventResultObj.description = (event.description ? event.description : null);
        eventResultObj.distance = venueDistance; // TODO: This is only kept to not break the API, will be removed in a later release!
        eventResultObj.startTime = (event.start_time ? event.start_time : null);
        eventResultObj.endTime = (event.end_time ? event.end_time : null);
        eventResultObj.timezone = (event.timezone ? event.timezone : null);
        eventResultObj.updatedTime = (event.updated_time ? event.updated_time : null);
        eventResultObj.timeFromNow = self.calculateStarttimeDifference(currentTimestamp, event.start_time);
        eventResultObj.isCancelled = event.is_canceled;
        eventResultObj.category = (event.category ? event.category : null);

        if (event.ticketing_terms_uri || event.ticketing_privacy_uri || event.ticket_uri) {
            eventResultObj.ticketing = {};
            if (event.ticket_uri) eventResultObj.ticketing.ticket_uri = event.ticket_uri;
            if (event.ticketing_terms_uri) eventResultObj.ticketing.terms_uri = event.ticketing_terms_uri;
            if (event.ticketing_privacy_uri) eventResultObj.ticketing.privacy_uri = event.ticketing_privacy_uri;
        }
        eventResultObj.place = {};
        if (event.place && event.place.id && event.place.id !== venue.id) {
            if (event.place.location && Object.getOwnPropertyNames(event.place.location).length > 0) {
                eventResultObj.place.id = event.place.id;
                eventResultObj.place.name = event.place.name || null;
                eventResultObj.place.location = event.place.location;
            } else {
                eventResultObj.place.id = venue.id;
                eventResultObj.place.name = venue.name;
                eventResultObj.place.location = (venue.location ? venue.location : null);
            }
        } else {
            eventResultObj.place.id = venue.id;
            eventResultObj.place.name = venue.name;
            eventResultObj.place.location = (venue.location ? venue.location : null);
        }
        eventResultObj.stats = {
            attending: event.attending_count,
            declined: event.declined_count,
            maybe: event.maybe_count,
            noreply: event.noreply_count
        };
        eventResultObj.distances = {
            venue: venueDistance,
            event: (eventResultObj.place.location && eventResultObj.place.location.latitude && eventResultObj.place.location.longitude ? parseInt((self.haversineDistance([eventResultObj.place.location.latitude, eventResultObj.place.location.longitude], [queryOptions.latitude, queryOptions.longitude], false)*1000).toFixed()) : null)
        };
        eventResultObj.venue = {};
        eventResultObj.venue.id = venue.id;
        eventResultObj.venue.name = venue.name;
        eventResultObj.venue.about = (venue.about ? venue.about : null);
        eventResultObj.venue.emails = (venue.emails ? venue.emails : null);
        eventResultObj.venue.coverPicture = (venue.cover ? venue.cover.source : null);
        eventResultObj.venue.profilePicture = (venue.picture ? venue.picture.data.url : null);
        eventResultObj.venue.category = (venue.category ? venue.category : null);
        eventResultObj.venue.categoryList = categoryList;
        eventResultObj.venue.location = (venue.location ? venue.location : null);
        return eventResultObj;

    }

    return new Promise(function (resolve, reject) {
        var error = null;
        if (!queryOptions.latitude || !queryOptions.longitude) {
            error = {
                "message": "Please specify the lat and lng parameters!",
                "code": 1
            };
            console.error(JSON.stringify(error));
            reject(error);
        } else if (!queryOptions.accessToken) {
            error = {
                "message": "Please specify an Access Token, either as environment variable or as accessToken parameter!",
                "code": 2
            };
            console.error(JSON.stringify(error));
            reject(error);
        } else if (queryOptions.sort && self.allowedSorts.indexOf(queryOptions.sort) === -1) {
            error = {
                "message": "An invalid sort option was passed: '" + queryOptions.sort + "'",
                "code": 3
            };
            console.error(JSON.stringify(error));
            reject(error);
        } else {

            var idLimit = 50, //FB only allows 50 ids per /?ids= call
                currentTimestamp = (new Date().getTime()/1000).toFixed(),
                venuesCount = 0,
                venuesWithEvents = 0,
                eventsCount = 0,
                placeUrl = "https://graph.facebook.com/" + queryOptions.version + "/search" +
                    "?type=place" +
                    "&q=" + queryOptions.query +
                    "&center=" + queryOptions.latitude + "," + queryOptions.longitude +
                    "&distance=" + queryOptions.distance +
                    "&limit=" + queryOptions.limit +
                    "&fields=id" +
                    "&access_token=" + queryOptions.accessToken;

            // Add categories if valid categories are provided
            if (queryOptions.categories.length > 0) {
                placeUrl += "&categories=" + JSON.stringify(queryOptions.categories);
            }

            //Get places as specified
            getPlaces(placeUrl).then(function(responseBody) {

                var ids = [],
                    tempArray = [],
                    data = responseBody.data;

                //Set venueCount
                venuesCount = data.length;

                //Create array of 50 places each
                data.forEach(function(idObj, index, arr) {
                    tempArray.push(idObj.id);
                    if (tempArray.length >= idLimit) {
                        ids.push(tempArray);
                        tempArray = [];
                    }
                });

                // Push the remaining places
                if (tempArray.length > 0) {
                    ids.push(tempArray);
                }

                return ids;
            }).then(function(ids) {

                var urls = [];

                //Create a Graph API request array (promisified)
                ids.forEach(function(idArray, index, arr) {
                    var eventsFields = [
                        "id",
                        "type",
                        "name",
                        "cover.fields(id,source)",
                        "picture.type(large)",
                        "description",
                        "start_time",
                        "end_time",
                        "category",
                        "attending_count",
                        "declined_count",
                        "maybe_count",
                        "noreply_count",
                        "ticket_uri",
                        "ticketing_privacy_uri",
                        "ticketing_terms_uri",
                        "place.fields(id,name,location{city,country,latitude,longitude,state,street,zip})",
                        "is_canceled",
                        "timezone",
                        "updated_time"
                    ];
                    var fields = [
                        "id",
                        "name",
                        "about",
                        "emails",
                        "cover.fields(id,source)",
                        "picture.type(large)",
                        "category",
                        "category_list.fields(name)",
                        "location{city,country,latitude,longitude,state,street,zip}",
                        "events.fields(" + eventsFields.join(",") + ")"
                    ];
                    var eventsUrl = "https://graph.facebook.com/" + queryOptions.version + "/" +
                        "?ids=" + idArray.join(",") +
                        "&access_token=" + queryOptions.accessToken +
                        "&fields=" + fields.join(",") +
                        ".since(" + queryOptions.since + ")";
                    if (queryOptions.until) {
                        eventsUrl += ".until(" + queryOptions.until + ")";
                    }
                    urls.push(rp.get(eventsUrl));
                });

                return urls;

            }).then(function(promisifiedRequests) {

                //Run Graph API requests in parallel
                return Promise.all(promisifiedRequests)

            })
            .then(function(results){

                var events = [];

                //Handle results
                results.forEach(function(resStr, index, arr) {
                    var resObj = resStr.data ? resStr.data : [];
                    Object.getOwnPropertyNames(resObj).forEach(function(venueId, index, array) {
                        var venue = resObj[venueId];
                        if (venue.events && venue.events.data.length > 0) {
                            venuesWithEvents++;
                            venue.events.data.forEach(function(event, index, array) {
                                // Check if only "active" events (non-draft, non-cancelled) should be shown
                                if (queryOptions.showActiveOnly) {
                                    // Check for non-cancelled events
                                    if (!event.is_canceled) {
                                        events.push(createEventObject(venue, event, currentTimestamp));
                                        eventsCount++;
                                    }
                                } else { // Just push it
                                    events.push(createEventObject(venue, event, currentTimestamp));
                                    eventsCount++;
                                }
                            });
                        }
                    });
                });

                //Sort if requested
                if (queryOptions.sort) {
                    switch (queryOptions.sort) {
                        case "time":
                            events.sort(self.compareTimeFromNow);
                            break;
                        case "distance": // TODO: This is kept for legacy reasons, will be removed in a future release
                            events.sort(self.compareVenueDistance);
                            break;
                        case "eventDistance":
                            events.sort(self.compareEventDistance);
                            break;
                        case "venueDistance":
                            events.sort(self.compareVenueDistance);
                            break;
                        case "venue":
                            events.sort(self.compareVenue);
                            break;
                        case "popularity":
                            events.sort(self.comparePopularity);
                            break;
                        default:
                            break;
                    }
                }

                //Produce result object
                resolve({events: events, metadata: {venues: venuesCount, venuesWithEvents: venuesWithEvents, events: eventsCount}});

            }).catch(function (e) {
                var error = {
                    "message": e.message || "There has been an unidentified error",
                    "code": -1
                };
                // Print stacktrace
                if (e.stack) {
                    console.error(e.stack);
                }
                reject(error);
            });
        }

    });

};

module.exports = EventSearch;
