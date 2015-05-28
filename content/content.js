var layerNode = document.createElement('div');
layerNode.setAttribute('id','dialog');
layerNode.setAttribute('title','Laser Focus');
var pNode = document.createElement('p');
pNode.innerHTML  = "You are currently in a focus block! Is this a productive site?";
var yesButton = document.createElement('button');
var noButton = document.createElement('button');
yesButton.innerHTML = "Yes";
noButton.innerHTML = "No";
layerNode.appendChild(pNode);
layerNode.appendChild(yesButton);
layerNode.appendChild(noButton);
document.body.appendChild(layerNode);
$("#dialog").dialog({
	autoOpen: true, 
	draggable: true,
	resizable: true,
	height: 'auto',
	width: 400,
	zIndex:3999,
	modal: false,
	open: function(event, ui) {
	    $(event.target).parent().css('position','fixed');
	    $(event.target).parent().css('top', '5px');
	    $(event.target).parent().css('left', '10px');
	}
});