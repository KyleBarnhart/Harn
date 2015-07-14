var data = {};
var state = {};

function clone(object) {
    return JSON.parse(JSON.stringify(object));
}

function addClass(node, cls) {
    if( node.className.indexOf(cls) < 0 ) {
        node.className = (node.className ? node.className + " ": "") + cls;
    }
}

function removeClass(node, cls) {
    if( node.className.indexOf(cls) >= 0) {
        var classes = node.className.split(" ");
        var idx = classes.indexOf(cls);
        classes.splice( idx, 1 );
        node.className = classes.splice( classes.indexOf(cls), 1).join( " " );
    }
}

/*
 * It's faster to make a map once then to check all worn armour every time.
 * returns map for bodypart/aspect protective values
 */
function getBodyPartAspectValues() {
    var bodyPartAspectValues = {};

    // Set all body part and aspect combinations to 0;
    for( var bodyPartKey in data.bodyparts ) {
        for (var aspectKey in data.combat.aspects) {
            bodyPartAspectValues[bodyPartKey + "-" + aspectKey] = 0;
        }
    }

    // Set body part and aspect combinations to protective values of armour worn.
    for( var kitKey in state.character.equipment.armour ) {
        var kit = state.character.equipment.armour[kitKey];

        if (kit.quantity < 1) {
            continue;
        }

        for( var bodyPartIndex in kit.component.bodyparts ) {
            var bodyPartKey = kit.component.bodyparts[bodyPartIndex];

            for( var aspectKey in kit.material.aspects ) {
                bodyPartAspectValues[bodyPartKey + "-" + aspectKey] += kit.material.aspects[aspectKey];
            }
        }
    }

    return bodyPartAspectValues;
}

function display() {
    // Table header
    var statsRows = "<tr><th></th>";

    for( var aspectKey in data.combat.aspects ) {
        statsRows += "<th>" + data.combat.aspects[aspectKey].name + "</th>";
    }
    statsRows += "</tr>";

    // Map of armour values for all body part and aspect combinations.
    var bodyPartAspectValues = getBodyPartAspectValues();

    // Body Parts Table
    var lastCategory;
    for( var bodyPartKey in data.bodyparts ) {
        var bodypart = data.bodyparts[bodyPartKey];

        var cssClass = (lastCategory && bodypart.category !== lastCategory) ? " class='newCategory'" : "";
        statsRows += "<tr " + "id='" + bodyPartKey + "' " + cssClass + "><td>" + bodypart.name + "</td>";
        lastCategory = bodypart.category;

        for( var aspectKey in data.combat.aspects ) {
            statsRows += "<td id='" + bodyPartKey + "-" + aspectKey + "'>" + bodyPartAspectValues[bodyPartKey + "-" + aspectKey] + "</td>";
        }
        statsRows += "</tr>";
    }

    // Armor table
    var armourRows = "<tr><th></th>";

    for( var materialKey in data.armour.materials ) {
        armourRows += "<th>" + data.armour.materials[materialKey].name + "</th>";
    }
    armourRows += "</tr>";


    var totalWeight = 0;
    var totalPrice = 0;

    lastCategory = null;
    for( var componentKey in data.armour.components ) {
        var component = data.armour.components[componentKey];

        var cssClass = (lastCategory && component.category !== lastCategory) ? " class='newCategory'" : "";

        armourRows += "<tr " + "id='" + componentKey + "' " + cssClass + ">\
                           <td>" + component.name + "</td>";

        lastCategory = component.category;

        for( var materialKey in data.armour.materials ) {
            if( component.materials.indexOf( materialKey ) >= 0 ) {
                var kit = state.character.equipment.armour[componentKey + "-" + materialKey];

                armourRows +=
                    "<td id='" + componentKey + "-" + materialKey + "'>" +
                        "<input type='checkbox' " + (kit.quantity > 0 ? "checked" : "") + ">" +
                    "</td>";

                totalWeight += kit.quantity * kit.weight;
                totalPrice += kit.quantity * kit.price;
            } else {
                armourRows += "<td></td>";
            }
        }

        armourRows += "</tr>";
    }

    document.getElementById( "stats" ).innerHTML = statsRows;
    document.getElementById( "armour" ).innerHTML = armourRows;

    // Show totals
    document.getElementById( "total-weight" ).innerHTML = totalWeight.toFixed(2);
    document.getElementById( "total-price" ).innerHTML = Math.round(totalPrice) + "d";

    // Update armour event
    var armourCheckboxes = document.querySelectorAll( "#armour input" );
    var updateArmour = function () {
        state.character.equipment.armour[this.parentNode.id].quantity += (this.checked ? 1 : -1);

        display();
    };
    for( var i = 0; i < armourCheckboxes.length; i++ ) {
        armourCheckboxes[i].addEventListener( "change", updateArmour );
    }

    // Show where armour protective values are coming from
    var bodypartRows = document.querySelectorAll( "#stats tr:not(:first-child)" );
    for( var i = 0; i < bodypartRows.length; i++ ) {
        bodypartRows[i].addEventListener( "mouseover", function() {
            hoverBodyPart( this, true );
        } );
        bodypartRows[i].addEventListener( "mouseout", function() {
            hoverBodyPart( this, false );
        } );
    }


    var armourRows = document.querySelectorAll( "#armour tr:not(:first-child) td" );
    for( var i = 0; i < armourRows.length; i++ ) {
        // Show what armour protect
        armourRows[i].addEventListener( "mouseover", function() {
            hoverComponentMaterial( this, true );
        } );
        armourRows[i].addEventListener( "mouseout", function() {
            hoverComponentMaterial( this, false );
        } );
    }
}

function hoverBodyPart( bodyPartRow, enable ) {
    var bodyPartKey = bodyPartRow.id;
    var bodypart = data.bodyparts[bodyPartKey];

    for( var kitKey in state.character.equipment.armour ) {
        var kit = state.character.equipment.armour[kitKey];

        if( kit.quantity < 1 || data.armour.components[kit.componentKey].bodyparts.indexOf(bodyPartKey) < 0 ) {
            continue;
        }

        if( enable ) {
            addClass( document.getElementById( kitKey ), "highlight" );
        } else {
            removeClass( document.getElementById( kitKey ), "highlight" );
        }
    }

    // Show information
    if( enable ) {
        setInfo( bodypart.name, "" );
    } else {
        setInfo();
    }
}

function hoverComponentMaterial( componentMaterialCell, enable ) {
    var componentKey = componentMaterialCell.parentNode.id;
    var component = data.armour.components[componentKey];

    for( var bodyPartIndex in component.bodyparts ) {
        var bodyPartKey = component.bodyparts[bodyPartIndex];

        if( enable ) {
            addClass( document.getElementById( bodyPartKey ), "highlight" );
        } else {
            removeClass( document.getElementById( bodyPartKey ), "highlight" );
        }
    }

    // Do the rest only if the piece of equipment is worn
    if( !componentMaterialCell.id || !state.character.equipment.armour[componentMaterialCell.id] ) {
        return;
    }

    var kit = state.character.equipment.armour[componentMaterialCell.id];

    // Show information
    if( enable ) {
        setInfo( component.name, "<p>" + component.description + "</p>\
                                  <strong>Weight:</strong><span>" + kit.weight.toFixed(2) + "</span>\
                                  <strong>Price:</strong><span>" + Math.round(kit.price) + "d</span>"
        );
    } else {
        setInfo();
    }
}

function setInfo( title, body ){
    document.getElementById("info-title").innerHTML = (title ? title : "Information");
    document.getElementById("info-body").innerHTML = (body ? body : "");
}

function ready() {
    // Set up a character
    state.character = {};

    state.character.equipment = {};
    state.character.equipment.armour = {};
    for( var componentKey in data.armour.components ) {
        var component = data.armour.components[componentKey];

        for( var materialIndex in component.materials ) {
            var materialKey = component.materials[materialIndex];
            var material = data.armour.materials[ materialKey ];

            // Get coverage for weight and price
            var coverage = 0;
            for( var bodyPartIndex in component.bodyparts ) {
                coverage += data.bodyparts[ component.bodyparts[bodyPartIndex] ].coverage;
            }

            var kit = {}
            kit.quantity = 0;
            kit.coverage = coverage;
            kit.componentKey = componentKey;
            kit.component = component;
            kit.materialKey = materialKey;
            kit.material = material;
            kit.weight = material.weight * coverage;
            kit.price = material.price * coverage;

            state.character.equipment.armour[componentKey + "-" + materialKey] = kit;
        }
    }

    display();
}
