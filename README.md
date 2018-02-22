# Search Facebook events by location, distance and search terms

[![Build Status](https://travis-ci.org/tobilg/facebook-events-by-location-core.svg?branch=master)](https://travis-ci.org/tobilg/facebook-events-by-location-core)
[![GitHub forks](https://img.shields.io/github/forks/tobilg/facebook-events-by-location-core.svg)](https://github.com/tobilg/facebook-events-by-location-core/network)
[![GitHub stars](https://img.shields.io/github/stars/tobilg/facebook-events-by-location-core.svg)](https://github.com/tobilg/facebook-events-by-location-core/stargazers)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/tobilg/facebook-events-by-location-core/master/LICENSE)
[![npm](https://img.shields.io/npm/v/facebook-events-by-location-core.svg)]()
[![npm](https://img.shields.io/npm/dt/facebook-events-by-location-core.svg)]()

As Facebook has discontinued the FQL query API for all apps created after 2014-04-30, it has gotten much more complicated to get public Facebook events by passing a location.

This implementation uses regular Facebook Graph API calls in a three-step approach to get the events:

1. Search for Places in the radius of the passed coordinate and distance (`/search?type=place&q={query}&center={coordinate}&distance={distance}`). This returns Page objects.
2. Use the returned Place Page objects to query for their events in parallel (`/?ids={id1},{id2},{id3},...`)
3. Unify, filter and sort the results from the parallel calls and return them to the client

### Known limitations

* The Graph API has some "instabilities" with search results. It's possible that the amount of results returned can vary between calls within seconds
* The `/search` endpoint "magically" limits the number of results, independent from the `distance` used (larger distance doesn't guarantee more results)
* [Rate limiting](https://developers.facebook.com/docs/graph-api/advanced/rate-limiting) will apply, but I experienced no call blocks within a reasonable amount of service requests. Be aware that the way this application works, there are potentially hundreds of (counted) Graph API calls per request to `/events`.

## Installation

### As NPM package

The module can be installed via 

`npm install facebook-events-by-location-core --save`

### Git

To clone the repository, use

`git clone https://github.com/tobilg/facebook-events-by-location-core.git`

## Usage

The basic usage pattern of this module is the following:

```javascript
var EventSearch = require("facebook-events-by-location-core");

var es = new EventSearch();

es.search({
  "lat": 40.710803,
  "lng": -73.964040
}).then(function (events) {
    console.log(JSON.stringify(events));
}).catch(function (error) {
    console.error(JSON.stringify(error));
});
```

### Access Tokens

The above example expects that the `FEBL_ACCESS_TOKEN` environment variable is set to a valid App Access Token. Otherwise, you need to specify the `accessToken` parameter with the request.

### Parameters

Mandatory parameters are the following:

* `lat`: The latitude of the position/coordinate the events shall be returned for
* `lng`: The longitude of the position/coordinate the events shall be returned for

Non-mandatory parameters

* `query`: The term(s) on which you want to narrow down your *location search* (this only filters the places, not the events itself!).
* `limit`: Limits the number of results in your *location search* (this only limits the places, not the events!). Default is `100`. This can be used to speed up response time if you don't want to retrieve the maximum number of events.
* `categories`: The array of [place categories](https://developers.facebook.com/docs/places/web/search#categories) that should be searched for. Valid entries are `ARTS_ENTERTAINMENT`, `EDUCATION`, `FITNESS_RECREATION`, `FOOD_BEVERAGE`, `HOTEL_LODGING`, `MEDICAL_HEALTH`, `SHOPPING_RETAIL`, `TRAVEL_TRANSPORTATION`. Default is none.  
* `accessToken`: The **App Access Token** to be used for the requests to the Graph API.
* `distance`: The distance in meters (it makes sense to use smaller distances, like max. 2500). Default is `100`.
* `sort`: The results can be sorted by `time`, `distance` (legacy option, will be removed in future release), `venueDistance`, `eventDistance`, `venue` or `popularity`. If omitted, the events will be returned in the order they were received from the Graph API.
* `version`: The version of the Graph API to use. Default is `v2.10`.
* `since`: The start of the range to filter results. Format is Unix timestamp or `strtotime` data value, as accepted by [FB Graph API](https://developers.facebook.com/docs/graph-api/using-graph-api#time).
* `until`: The end of the range to filter results.
* `showActiveOnly`: Whether only non-cancelled, non-draft Events should be shown. Format is `boolean`. Default is `true`.

### Location/Place data in the query result

There are two types of locations in the resulting event JSON objects:

* `place`: This is the consolidated Place object from the Venue (which is actually the Page object which was returned from the Place search), and the Event's place data. The latter will supersede the Place page data.
* `venue.location`: This is the location data of the Page object.

As the Facebook Graph API can only be queried for Places via coordinate/distance, and Events can have their own, "real" location, it's possible that the place data which is found in `place` can be outside the boundaries of the original query. 

Consequences:
* If you want consistency regarding query vs. results, you should use `venue.location`. 
* If you want accuracy regarding the real event location, you should use `place`.  

### Sample output (shortened)

```javascript
{
  "events": [{
    "id": "836655879846811",
    "name": "U.S. Girls at Baby's All Right",
    "type": "public",
    "coverPicture": "https://scontent.xx.fbcdn.net/v/t31.0-8/s720x720/24883312_1521878931228093_3223523563973203944_o.jpg?oh=9bc3e5c5d45e39c542b057b92df95243&oe=5AC0353F",
    "profilePicture": "https://scontent.xx.fbcdn.net/v/t1.0-0/c0.0.200.200/p200x200/24862268_1521878931228093_3223523563973203944_n.jpg?oh=23ec7dc943402ec7e0137f2d17f27719&oe=5AC246F8",
    "description": "Friday, April 13th @ Baby's All Right\n\nAdHoc Presents\n\nU.S. Girls\n\nTickets:  http://ticketf.ly/2j7AegO\n\n| Baby's All Right |\n146 Broadway @ Bedford Ave | Williamsburg, Brooklyn \nJMZ-Marcy, L-Bedford, G-Broadway | 8pm | $12 | 21+\n\nCheck out our calendar and sign up for our mailing list http://adhocpresents.com/",
    "distance": 89,
    "startTime": "2018-04-13T20:00:00-0400",
    "endTime": null,
    "timeFromNow": 9982924,
    "isCancelled": false,
    "category": "MUSIC_EVENT",
    "ticketing": {
      "ticket_uri": "http://ticketf.ly/2j7AegO"
    },
    "place": {
      "id": "460616340718401",
      "name": "Baby's All Right",
      "location": {
        "city": "Brooklyn",
        "country": "United States",
        "latitude": 40.71012,
        "longitude": -73.96348,
        "state": "NY",
        "street": "146 Broadway",
        "zip": "11211"
      }
    },
    "stats": {
      "attending": 20,
      "declined": 0,
      "maybe": 77,
      "noreply": 6
    },
    "distances": {
      "venue": 89,
      "event": 89
    },
    "venue": {
      "id": "460616340718401",
      "name": "Baby's All Right",
      "about": "babysallright@gmail.com",
      "emails": ["babysallright@gmail.com"],
      "coverPicture": "https://scontent.xx.fbcdn.net/v/t31.0-8/s720x720/20507438_1418517768261582_7945740169309872258_o.jpg?oh=24280a4732605e140c227db955c8d5e0&oe=5AC6B878",
      "profilePicture": "https://scontent.xx.fbcdn.net/v/t1.0-1/p200x200/1480734_642185745894792_5820988503650852577_n.png?oh=c6e72b8a5645644e7dd3eb3d2161329f&oe=5AC0CD2D",
      "category": "Bar",
      "categoryList": ["Bar", "Breakfast & Brunch Restaurant", "Dance & Night Club"],
      "location": {
        "city": "Brooklyn",
        "country": "United States",
        "latitude": 40.71012,
        "longitude": -73.96348,
        "state": "NY",
        "street": "146 Broadway",
        "zip": "11211"
      }
    }
  }],
  "metadata": {
    "venues": 100,
    "venuesWithEvents": 2,
    "events": 25
  }
}
```