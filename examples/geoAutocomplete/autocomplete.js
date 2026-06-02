var bemap = bemap || {};
/**
 * BeNomad BeMap JavaScript API - GeoAutocomplete
 */

/**
 * @classdesc
 * Base class for GeoAutocomplete.
 * @public
 * @constructor
 * @abstract
 * @param {bemap.Context} context BeMap-JS-API Context. Mandatory.
 * @param {object} options see below the available values.
 */
bemap.GeoAutocompleteTest = function(context, options) {

  this.context = context;
  this.geoserver = context.geoserver;

  var opts = options ? options : {};

  if (opts.geoserver) {
    this.geoserver = opts.geoserver;
  }
};

/**
 * Get the context.
 * @return {String} language
 */
bemap.GeoAutocompleteTest.prototype.getContext = function() {
  return this.context;
};

/**
 *Autocomplete is sending only when user stop taping text in input and after option.timer time
 *@param options see below
 *@param listener return by function, list of autocomplete results
 */
bemap.GeoAutocompleteTest.prototype.autocomplete = function(options, listener) {

  if (!options) {
    console.error("Options required");
  };
  if (!options.inputId) {
    console.error("Input ID required");
  };
  if (!options.countryCode) {
    console.error("Country code required");
  };
  if (!options.target) {
    console.error("Target required");
  };
  //switch to allows list of autocomplete propositions
  var showList = true
  if (!options.showList && options.showList !== undefined) {
    showList = options.showList;
  }
  //stock this class event
  var _this = this;
  var id = options.inputId;
  //call geocoder methode and pass this context

  var geo = new bemap.Geocoder(this.getContext());
  //console.log(this.getContext());
  //set timer to send the request to the geocoder
  var typingTimer; //timer identifier
  var doneTypingInterval = options.timer ? options.timer : 2000; //time in ms

  //on keyup, start the countdown
  id[0].addEventListener("input", function(e) {

    var countryCode = options.countryCode
    if (typeof countryCode !== 'string') {
      countryCode = options.countryCode.val()
    };
    //initialize geocoder elements
    var elements = {
      searchInfo: new bemap.GeoSearchInfo({
        searchType: options.searchType ? options.searchType : "CONTAINS",
        countryCode: countryCode,
        country: options.country,
        language: options.language ? options.language : '',
        maxResult: options.maxResult ? options.maxResult : 10
      })
    }
    //after every click
    clearTimeout(typingTimer);
    if ($(id).val()) {
      //requires city if search street if not algorythm not working
      if (options.target == "street") {
        if (!options.city) {
          console.error("City required");
        } else {
          var city = options.city;
          if (typeof city !== 'string') {
            city = options.city.val();
          }
          elements.searchInfo.city = city;
        };
      };
      //check if parametr of research exist
      if (elements.searchInfo[options.target] !== undefined) {
        elements.searchInfo[options.target] = $(id).val()
      } else {
        console.error("Target do not exist");
      }
      //the request is sending when user stop taping and after option.timer
      typingTimer = setTimeout(function() {
        //create success call for the geocode methode chack geocode documentation
        elements.success = function(response, doc, object, xhr) {

          //prepare list of results
          var countries = [];
          for (var i = 0; i < response.geocodingItems.length; i++) {
            var address = response.geocodingItems[i].PostalAddress[0][options.target]

            if (address !== null) {
              countries.push(address)
            }
          }
          //show list by calling showList methode if true
          if (countries.length !== 0) {
            if (showList) {
              _this.showList(id[0], countries);
            };
            //sent the result if listener
            if (listener) {
              listener(countries)
            };
          } else {
            console.log('The result of autocomplete not found');
          };
        } //end of success element

        //call geocode methode from Geocoding class
        console.log(elements);
        geo.geocode(elements);

      }, doneTypingInterval);
    } //end of input veryfication
  }); //end of input change
}

/**
 *This methode was found on the net to prevent charging jQuery UI lib with nice autocomplete functionality
 *@param inp - id of input field
 *@param arr - result of geocoding already filtred
 */
bemap.GeoAutocompleteTest.prototype.showList = function(inp, arr) {
  /*the autocomplete function takes two arguments,
  the text field element and an array of possible autocompleted values:*/
  var currentFocus;
  /*execute a function when someone writes in the text field:*/
  var a, b, i, val = inp.value;
  /*close any already open lists of autocompleted values*/
  closeAllLists();
  if (!val) {
    return false;
  }
  currentFocus = -1;
  /*create a DIV element that will contain the items (values):*/
  a = document.createElement("DIV");
  a.setAttribute("id", inp.id + "autocomplete-list");
  a.setAttribute("class", "autocomplete-items");
  /*append the DIV element as a child of the autocomplete container:*/
  inp.parentNode.appendChild(a);
  /*for each item in the array...*/
  for (i = 0; i < arr.length; i++) {
    //check at which position tapping value apears in arr stringify
    var item = arr[i].toUpperCase()
    var getIdx = item.indexOf(val.toUpperCase())
    /*create a DIV element for each matching element:*/
    b = document.createElement("DIV");
    /*make the matching letters bold:*/
    if (getIdx >= 0) {
      b.innerHTML += arr[i].substr(0, getIdx);
      b.innerHTML += "<strong>" + arr[i].substr(getIdx, val.length) + "</strong>";
      b.innerHTML += arr[i].substr(val.length + getIdx);
    } else {
      b.innerHTML = arr[i]
    }
    /*insert a input field that will hold the current array item's value:*/
    b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
    /*execute a function when someone clicks on the item value (DIV element):*/
    b.addEventListener("click", function(e) {
      /*insert the value for the autocomplete text field:*/
      inp.value = this.getElementsByTagName("input")[0].value;
      /*close the list of autocompleted values,
      (or any other open lists of autocompleted values:*/
      closeAllLists();
    });
    a.appendChild(b);
  }
  //detect if listener was already added to the input
  if (inp.getAttribute('listener') !== 'true') {
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function(e) {

      this.setAttribute('listener', 'true');
      var x = document.getElementById(this.id + "autocomplete-list");
      if (x) x = x.getElementsByTagName("div");
      if (e.keyCode == 40) {
        /*If the arrow DOWN key is pressed,
        increase the currentFocus variable:*/
        currentFocus++;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 38) { //up
        /*If the arrow UP key is pressed,
        decrease the currentFocus variable:*/
        currentFocus--;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 13) {
        /*If the ENTER key is pressed, prevent the form from being submitted,*/
        e.preventDefault();
        if (currentFocus > -1) {
          /*and simulate a click on the "active" item:*/
          if (x) x[currentFocus].click();
        }
      }
    });
  }

  function addActive(x) {
    /*a function to classify an item as "active":*/
    if (!x) return false;
    /*start by removing the "active" class on all items:*/
    removeActive(x);
    if (currentFocus >= x.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = (x.length - 1);
    /*add class "autocomplete-active":*/
    x[currentFocus].classList.add("autocomplete-active");
  }

  function removeActive(x) {
    /*a function to remove the "active" class from all autocomplete items:*/
    for (var i = 0; i < x.length; i++) {
      x[i].classList.remove("autocomplete-active");
    }
  }

  function closeAllLists(elmnt) {
    /*close all autocomplete lists in the document,
    except the one passed as an argument:*/
    var x = document.getElementsByClassName("autocomplete-items");
    for (var i = 0; i < x.length; i++) {
      if (elmnt != x[i] && elmnt != inp) {
        x[i].parentNode.removeChild(x[i]);
      }
    }
  }
  /*execute a function when someone clicks in the document:*/
  document.addEventListener("click", function(e) {
    closeAllLists(e.target);
  });
}
