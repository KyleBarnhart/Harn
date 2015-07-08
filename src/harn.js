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
    for( var bodyPartKey in state.bodyparts ) {
        for (var aspectKey in state.combat.aspects) {
            bodyPartAspectValues[bodyPartKey + "-" + aspectKey] = 0;
        }
    }

    // Set body part and aspect combinations to protective values of armour worn.
    for( var kitKey in state.character.equipment ) {
        var kit = state.character.equipment[kitKey];

        if (kit.quantity < 1) {
            continue;
        }

        var componentBodyparts = state.armour.components[kit.componentKey].bodyparts;
        var materialAspects = state.armour.materials[kit.materialKey].aspects;

        for( var bodyPartIndex in componentBodyparts ) {
            var bodyPartKey = componentBodyparts[bodyPartIndex];

            for( var aspectKey in materialAspects ) {
                bodyPartAspectValues[bodyPartKey + "-" + aspectKey] += materialAspects[aspectKey];
            }
        }
    }

    return bodyPartAspectValues;
}

function display() {
    // Table header
    var statsRows = "<tr><th></th>";

    for( var aspectKey in state.combat.aspects ) {
        statsRows += "<th>" + state.combat.aspects[aspectKey].name + "</th>";
    }
    statsRows += "</tr>";

    // Map of armour values for all body part and aspect combinations.
    var bodyPartAspectValues = getBodyPartAspectValues();

    // Body Parts Table
    var lastCategory;
    for( var bodyPartKey in state.bodyparts ) {
        var bodypart = state.bodyparts[bodyPartKey];

        var cssClass = (lastCategory && bodypart.category !== lastCategory) ? " class='newCategory'" : "";
        statsRows += "<tr " + "id='" + bodyPartKey + "' " + cssClass + "><td>" + bodypart.name + "</td>";
        lastCategory = bodypart.category;

        for( var aspectKey in state.combat.aspects ) {
            statsRows += "<td id='" + bodyPartKey + "-" + aspectKey + "'>" + bodyPartAspectValues[bodyPartKey + "-" + aspectKey] + "</td>";
        }
        statsRows += "</tr>";
    }

    // Armor table
    var armourRows = "<tr><th></th>";

    for( var materialKey in state.armour.materials ) {
        armourRows += "<th>" + state.armour.materials[materialKey].name + "</th>";
    }
    armourRows += "</tr>";

    lastCategory = null;
    for( var componentKey in state.armour.components ) {
        var component = state.armour.components[componentKey];

        var cssClass = (lastCategory && component.category !== lastCategory) ? " class='newCategory'" : "";
        armourRows += "<tr " + "id='" + componentKey + "' " + cssClass + "><td>" + component.name + "</td>";
        lastCategory = component.category;

        for( var materialKey in state.armour.materials ) {
            if( component.materials.indexOf( materialKey ) >= 0 ) {
                armourRows +=
                    "<td id='" + componentKey + "-" + materialKey + "'>" +
                        "<input type='checkbox' data-componentKey='" + componentKey + "' data-materialKey='" + materialKey + "'" +
                            (state.character.equipment[componentKey + "-" + materialKey].quantity > 0 ? "checked" : "") + ">" +
                    "</td>";
            } else {
                armourRows += "<td></td>";
            }
        }

        armourRows += "</tr>";
    }

    document.getElementById( "stats" ).innerHTML = statsRows;
    document.getElementById( "armour" ).innerHTML = armourRows;

    // Update armour event
    var armourCheckboxes = document.querySelectorAll( "#armour input" );
    var updateArmour = function () {
        var componentKey = this.dataset.componentkey;
        var materialKey = this.dataset.materialkey;

        state.character.equipment[componentKey + "-" + materialKey].quantity += (this.checked ? 1 : -1);

        display();
    };
    for( var i = 0; i < armourCheckboxes.length; i++ ) {
        armourCheckboxes[i].addEventListener( "change", updateArmour );
    }

    // Show where armour protective values are coming from
    var bodypartRows = document.querySelectorAll( "#stats tr:not(:first-child)" );
    for( var i = 0; i < bodypartRows.length; i++ ) {
        bodypartRows[i].addEventListener( "mouseover", function() {
            highlightComponents( this.id, true );
        } );
        bodypartRows[i].addEventListener( "mouseout", function() {
            highlightComponents( this.id, false );
        } );
    }


    var armourRows = document.querySelectorAll( "#armour tr:not(:first-child)" );
    for( var i = 0; i < armourRows.length; i++ ) {
        // Show what armour protect
        armourRows[i].addEventListener( "mouseover", function() {
            highlightBodyparts( this.id, true );
        } );
        armourRows[i].addEventListener( "mouseout", function() {
            highlightBodyparts( this.id, false );
        } );
    }
}

function highlightComponents( bodyPartKey, enable ) {
    for( var kitKey in state.character.equipment ) {
        var kit = state.character.equipment[kitKey];

        if( kit.quantity < 1 ) {
            continue;
        }

        if( enable ) {
            addClass( document.getElementById( kitKey ), "highlight" );
        } else {
            removeClass( document.getElementById( kitKey ), "highlight" );
        }
    }
}

function highlightBodyparts( componentKey, enable ) {
    var component = state.armour.components[componentKey];
    for( var bodyPartIndex in component.bodyparts ) {
        var bodyPartKey = component.bodyparts[bodyPartIndex];

        if( enable ) {
            addClass( document.getElementById( bodyPartKey ), "highlight" );
        } else {
            removeClass( document.getElementById( bodyPartKey ), "highlight" );
        }
    }
}

function ready() {
	state.armour = getArmor();
	state.combat = getCombat();
    state.bodyparts = getBodyParts();

    // Set up a character
    state.character = {};

    // Will be { "componentKey-materialKey": { "quantity": 0, "componentKey": "key",  "materialKey": "key" } , ... }
    state.character.equipment = {};
    for( var componentKey in state.armour.components ) {
        var component = state.armour.components[componentKey];

        for( var materialIndex in component.materials ) {
            var materialKey = component.materials[materialIndex];

            var kit = {}
            kit.quantity = 0;
            kit.componentKey = componentKey;
            kit.materialKey = materialKey;

            state.character.equipment[componentKey + "-" + materialKey] = kit;
        }
    }

    display();
}
