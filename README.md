# Search Facebook events by location, distance and search terms

As Facebook has discontinued the FQL query API for all apps created after 2014-04-30, it has gotten much more complicated to get public Facebook events by passing a location.

This implementation uses regular Facebook Graph API calls in a three-step approach to get the events:

1. Search for places in the radius of the passed coordinate and distance (`/search?type=place&q={query}&center={coordinate}&distance={distance}`)
2. Use the places to query for their events in parallel (`/?ids={id1},{id2},{id3},...`)
3. Unify, filter and sort the results from the parallel calls and return them to the client

###Known limitations

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

var es = new EventSearch({
    "lat": 40.710803,
    "lng": -73.964040
});

es.search().then(function (events) {
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
* `accessToken`: The **App Access Token** to be used for the requests to the Graph API.
* `distance`: The distance in meters (it makes sense to use smaller distances, like max. 2500). Default is `100`.
* `sort`: The results can be sorted by `time`, `distance`, `venue` or `popularity`. If omitted, the events will be returned in the order they were received from the Graph API.
* `version`: The version of the Graph API to use. Default is `v2.7`.
* `since`: The start of the range to filter results. Format is Unix timestamp or `strtotime` data value, as accepted by [FB Graph API](https://developers.facebook.com/docs/graph-api/using-graph-api#time).
* `until`: The end of the range to filter results.

### Sample output (shortened)

```javascript
{
	"events": [{
        "id": "913797995409682",
        "name": "Tom Misch at Baby's All Right - Brooklyn, NY",
        "type": "public",
        "coverPicture": "https://scontent.xx.fbcdn.net/t31.0-8/q84/s720x720/13640856_1107200012651875_5165020515859707325_o.jpg",
        "profilePicture": "https://scontent.xx.fbcdn.net/v/t1.0-0/c0.63.200.200/p200x200/13716257_1107200012651875_5165020515859707325_n.jpg?oh=840e5aa7e4c2a882d170934c06909b0f&oe=5852B03A",
        "description": "Communion Music Presents\nTom Misch\n\nBaby's All Right - Saturday November 5\n\n**SOLD OUT**",
        "distance": "103",
        "startTime": "2016-11-05T19:00:00-0400",
        "endTime": "2016-11-05T23:59:00-0400",
        "timeFromNow": 6864534,
        "stats": {
            "attending": 118,
            "declined": 0,
            "maybe": 193,
            "noreply": 259
        },
        "venue": {
            "id": "460616340718401",
            "name": "Baby's All Right",
            "about": "babysallright@gmail.com",
            "emails": ["babysallright@gmail.com"],
            "coverPicture": "https://scontent.xx.fbcdn.net/v/t1.0-9/10649483_874901589289872_3338946923837693978_n.jpg?oh=f514ac7ee60c2a7e58158179686bef28&oe=584392F3",
            "profilePicture": "https://scontent.xx.fbcdn.net/v/t1.0-1/p200x200/1480734_642185745894792_5820988503650852577_n.png?oh=0ba9012178c119defae67c932d0841bd&oe=5847FD2D",
            "location": {
                "city": "Brooklyn",
                "country": "United States",
                "latitude": 40.709985,
                "longitude": -73.963476,
                "state": "NY",
                "street": "146 Broadway",
                "zip": "11211"
            }
        }
    },
	... 
	],
	"metadata": {
		"venues": 1,
		"venuesWithEvents": 1,
		"events": 4
	}
}
```