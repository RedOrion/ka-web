YAHOO.namespace("lacuna");

if (typeof YAHOO.lacuna.MapStar == "undefined" || !YAHOO.lacuna.MapStar) {
	
(function(){
	var Lang = YAHOO.lang,
		Util = YAHOO.util,
		Dom = Util.Dom,
		Event = Util.Event,
		Sel = Util.Selector,
		Lacuna = YAHOO.lacuna,
		Game = Lacuna.Game,
		Lib = Lacuna.Library;
		
	var MapStar = function() {
		this.createEvent("onMapRpc");
		this.createEvent("onMapRpcFailed");
		//this.createEvent("onChangeToSystemView");
		this.createEvent("onChangeToPlanetView");
		
		this._renameLabel = "Rename";
		this._sendSpiesLabel = "Send Spy";
		this._fetchSpiesLabel = "Fetch Spy";
		
		this._buildDetailsPanel();
		this._buildPlanetDetailsPanel();
		this._buildFindPanel();
	};
	MapStar.prototype = {
		_buildDetailsPanel : function() {
			var panelId = "starDetails";
			
			var panel = document.createElement("div");
			panel.id = panelId;
			panel.innerHTML = ['<div class="hd">Details</div>',
				'<div class="bd">',
				'	<div class="yui-g">',
				'		<div class="yui-u first" id="starDetailsImg" class="background:black:width:100px;">',
				'		</div>',
				'		<div class="yui-u" id="starDetailsInfo">',
				'		</div>',
				'	</div>',
				'	<div id="starDetailTabs" class="yui-navset">',
				'		<ul class="yui-nav">',
				'			<li><a href="#"><em>Send</em></a></li>',
				'			<li><a href="#"><em>Unavailable</em></a></li>',
				'		</ul>',
				'		<div class="yui-content">',
				'			<div><div><ul id="starDetailSendShips"></ul></div></div>',
				'			<div><div><ul id="starDetailUnavailShips"></ul></div></div>',
				'		</div>',
				'	</div>',
				'</div>'].join('');
			document.body.insertBefore(panel, document.body.firstChild);
			Dom.addClass(panel, "nofooter");
			
			this.starDetails = new YAHOO.widget.Panel(panelId, {
				constraintoviewport:true,
				visible:false,
				draggable:true,
				effect:Game.GetContainerEffect(),
				fixedcenter:false,
				close:true,
				underlay:false,
				width:"500px",
				zIndex:9995,
				context:["header","tr","br", ["beforeShow", "windowResize"], [-200,40]]
			});
			this.starDetails.addQueue = function(seconds, queueFn, elm, sc) {
				this.queue = this.queue || [];
				//check if the queue is empty and store
				var notStarted = this.queue.length == 0;
				//push new queue item so it's immediately available for the tick
				this.queue.push({secondsRemaining:seconds*1, el:elm, fn:queueFn, scope:sc});
				//make sure we subscribe to the tick
				if(notStarted) {
					Game.onTick.subscribe(this.processQueue, this, true);
				}
			};
			this.starDetails.processQueue = function(e, oArgs) {
				if(this.queue.length > 0) {
					var queue = this.queue,
						diff = oArgs[0]/1000,
						newq = [];

					while(queue.length > 0) {
						var callback = queue.pop();
						callback.secondsRemaining -= diff;
						if(callback.secondsRemaining > 0) {
							newq.push(callback);
						}
						callback.fn.call(callback.scope || this, callback.secondsRemaining, callback.el);
					}
					this.queue = newq;
				}
				else {
					Game.onTick.unsubscribe(this.processQueue);
				}
			};
			this.starDetails.resetQueue = function() {
				Game.onTick.unsubscribe(this.processQueue);
				this.queue = [];
			};
			this.starDetails.addTab = function(tab) {
				this.removeableTabs = this.removeableTabs || [];
				this.removeableTabs.push(tab);
				this.tabView.addTab(tab);
			};
			this.starDetails.removeTabs = function() {
				var rt = this.removeableTabs;
				if(rt && rt.length > 0) {
					for(var n=0; n<rt.length; n++) {
						Event.purgeElement(rt[n].get("contentEl"));
						this.tabView.removeTab(rt[n]);
					}
					delete this.removeableTabs;
				}
				this.tabView.selectTab(0);
			};
			this.starDetails.resetDisplay = function(oSelf) {
				delete oSelf.selectedStar;
				this.resetQueue();
				this.removeTabs();
			};
			
			this.starDetails.renderEvent.subscribe(function(){
				this.starDetails.tabView = new YAHOO.widget.TabView("starDetailTabs");
				/*Event.delegate("starDetailsInfo", "click", function(e, matchedEl, container){
					var data = this.selectedStar;
					if(data) {
						if(matchedEl.innerHTML == "Send Probe") {
							this.SendProbe(data);
						}
					}
				}, "button", this, true);*/
			}, this, true);
			this.starDetails.hideEvent.subscribe(function(){
				this.starDetails.resetDisplay(this);
			}, this, true);
			
			this.starDetails.isStarPanel = true;
			
			this.starDetails.render();
			Game.OverlayManager.register(this.starDetails);
		},
		_buildPlanetDetailsPanel : function() {
			var panelId = "planetDetails";
			
			var panel = document.createElement("div");
			panel.id = panelId;
			panel.innerHTML = ['<div class="hd">Details</div>',
				'<div class="bd">',
				'	<div class="yui-g">',
				'		<div class="yui-u first" id="planetDetailsImg">',
				'		</div>',
				'		<div class="yui-u" id="planetDetailsInfo">',
				'		</div>',
				'	</div>',
				'	<div id="planetDetailTabs" class="yui-navset">',
				'		<ul class="yui-nav">',
				'			<li><a href="#planetDetailOre"><em>Ore</em></a></li>',
				'			<li><a href="#planetDetailRename"><em>',this._renameLabel,'</em></a></li>',
				'			<li><a href="#planetDetailSendSpies"><em>',this._sendSpiesLabel,'</em></a></li>',
				'			<li><a href="#planetDetailFetchSpies"><em>',this._fetchSpiesLabel,'</em></a></li>',
				'			<li><a href="#"><em>Send</em></a></li>',
				'			<li><a href="#"><em>Unavailable</em></a></li>',
				'		</ul>',
				'		<div class="yui-content">',
				'			<div id="planetDetailOre">',
				'				<div class="yui-g">',
				'					<div class="yui-u first">',
				'						<ul>',
				'							<li><label>Anthracite</label><span class="buildingDetailsNum" id="planetDetailsAnthracite"></span></li>',
				'							<li><label>Bauxite</label><span class="buildingDetailsNum" id="planetDetailsBauxite"></span></li>',
				'							<li><label>Beryl</label><span class="buildingDetailsNum" id="planetDetailsBeryl"></span></li>',
				'							<li><label>Chalcopyrite</label><span class="buildingDetailsNum" id="planetDetailsChalcopyrite"></span></li>',
				'							<li><label>Chromite</label><span class="buildingDetailsNum" id="planetDetailsChromite"></span></li>',
				'							<li><label>Fluorite</label><span class="buildingDetailsNum" id="planetDetailsFluorite"></span></li>',
				'							<li><label>Galena</label><span class="buildingDetailsNum" id="planetDetailsGalena"></span></li>',
				'							<li><label>Goethite</label><span class="buildingDetailsNum" id="planetDetailsGoethite"></span></li>',
				'							<li><label>Gold</label><span class="buildingDetailsNum" id="planetDetailsGold"></span></li>',
				'							<li><label>Gypsum</label><span class="buildingDetailsNum" id="planetDetailsGypsum"></span></li>',
				'						</ul>',
				'					</div>',
				'					<div class="yui-u">',
				'						<ul>',
				'							<li><label>Halite</label><span class="buildingDetailsNum" id="planetDetailsHalite"></span></li>',
				'							<li><label>Kerogen</label><span class="buildingDetailsNum" id="planetDetailsKerogen"></span></li>',
				'							<li><label>Magnetite</label><span class="buildingDetailsNum" id="planetDetailsMagnetite"></span></li>',
				'							<li><label>Methane</label><span class="buildingDetailsNum" id="planetDetailsMethane"></span></li>',
				'							<li><label>Monazite</label><span class="buildingDetailsNum" id="planetDetailsMonazite"></span></li>',
				'							<li><label>Rutile</label><span class="buildingDetailsNum" id="planetDetailsRutile"></span></li>',
				'							<li><label>Sulfur</label><span class="buildingDetailsNum" id="planetDetailsSulfur"></span></li>',
				'							<li><label>Trona</label><span class="buildingDetailsNum" id="planetDetailsTrona"></span></li>',
				'							<li><label>Uraninite</label><span class="buildingDetailsNum" id="planetDetailsUraninite"></span></li>',
				'							<li><label>Zircon</label><span class="buildingDetailsNum" id="planetDetailsZircon"></span></li>',
				'						</ul>',
				'					</div>',
				'				</div>',
				'			</div>',
				'			<div id="planetDetailRename"><ul>',
				'				<li><label>New Planet Name: </label><input type="text" id="planetDetailNewName" maxlength="100" /></li>',
				'				<li class="alert" id="planetDetailRenameMessage"></li>',
				'				<li><button type="button" id="planetDetailRenameSubmit">Rename</button></li>',
				'			</ul></div>',
				'			<div id="planetDetailSendSpies" style="height: 240px">',
				'				<div class="planetDetailSelectSpies">',
				'					<div class="planetDetailSpiesMessage"></div><button>Send</button>',
				'					<ul class="planetDetailSpiesList">',
				'					</ul>',
				'				</div>',
				'				<div class="planetDetailSelectSpyShip">',
				'					<div class="planetDetailSpyShipHeader">',
				'						<div class="planetDetailSpyShipMessage">Sending <span class="count"></span> spies.  Select Ship:</div><button>Back</button>',
				'					</div>',
				'					<ul class="planetDetailSpyShipList"></ul>',
				'				</div>',
				'			</div>',
				'			<div id="planetDetailFetchSpies" style="height: 240px">',
				'				<div class="planetDetailSelectSpies">',
				'					<div class="planetDetailSpiesMessage"></div><button>Fetch</button>',
				'					<ul class="planetDetailSpiesList"></ul>',
				'				</div>',
				'				<div class="planetDetailSelectSpyShip">',
				'					<div class="planetDetailSpyShipHeader">',
				'						<div class="planetDetailSpyShipMessage">Fetching <span class="count"></span> spies.  Select Ship:</div><button>Back</button>',
				'					</div>',
				'					<ul class="planetDetailSpyShipList">',
				'					</ul>',
				'				</div>',
				'			</div>',
				'			<div><div><ul id="planetDetailSendShips"></ul></div></div>',
				'			<div><div><ul id="planetDetailUnavailShips"></ul></div></div>',
				'		</div>',
				'	</div>',
				'</div>'].join('');
			document.body.insertBefore(panel, document.body.firstChild);
			Dom.addClass(panel, "nofooter");
			
			this.planetDetails = new YAHOO.widget.Panel(panelId, {
				constraintoviewport:true,
				visible:false,
				draggable:true,
				effect:Game.GetContainerEffect(),
				fixedcenter:false,
				close:true,
				underlay:false,
				width:"500px",
				zIndex:9995,
				context:["header","tr","br", ["beforeShow", "windowResize"], [-200,40]]
			});
			this.planetDetails.addQueue = function(seconds, queueFn, elm, sc) {
				this.queue = this.queue || [];
				//check if the queue is empty and store
				var notStarted = this.queue.length == 0;
				//push new queue item so it's immediately available for the tick
				this.queue.push({secondsRemaining:seconds*1, el:elm, fn:queueFn, scope:sc});
				//make sure we subscribe to the tick
				if(notStarted) {
					Game.onTick.subscribe(this.processQueue, this, true);
				}
			};
			this.planetDetails.processQueue = function(e, oArgs) {
				if(this.queue.length > 0) {
					var queue = this.queue,
						diff = oArgs[0]/1000,
						newq = [];

					while(queue.length > 0) {
						var callback = queue.pop();
						callback.secondsRemaining -= diff;
						if(callback.secondsRemaining > 0) {
							newq.push(callback);
						}
						callback.fn.call(callback.scope || this, callback.secondsRemaining, callback.el);
					}
					this.queue = newq;
				}
				else {
					Game.onTick.unsubscribe(this.processQueue);
				}
			};
			this.planetDetails.resetQueue = function() {
				Game.onTick.unsubscribe(this.processQueue);
				this.queue = [];
			};
			this.planetDetails.addTab = function(tab) {
				this.removeableTabs = this.removeableTabs || [];
				this.removeableTabs.push(tab);
				this.tabView.addTab(tab);
			};
			this.planetDetails.removeTabs = function() {
				var rt = this.removeableTabs;
				if(rt && rt.length > 0) {
					for(var n=0; n<rt.length; n++) {
						this.tabView.removeTab(rt[n]);
					}
					delete this.removeableTabs;
				}
				this.tabView.selectTab(0);
			};
			this.planetDetails.resetDisplay = function(oSelf) {
				delete oSelf.selectedBody;
				delete oSelf.selectedTile;
				this.resetQueue();
				this.removeTabs();
			};
			
			this.planetDetails.renderEvent.subscribe(function(){
				Event.delegate("planetDetailsInfo", "click", this.DetailsClick, "button", this, true);
				var tv = this.planetDetails.tabView = new YAHOO.widget.TabView("planetDetailTabs");
				var spyTabs = {
					"planetDetailSendSpies" : 2,
					"planetDetailFetchSpies" : 3
				};
				var tabChange = function(e, tabEl) {
						if (e.newValue) {
							this.ShowSpies(tabEl);
						}
					},
					hideEventFn = function(){
						delete this.availSpyShips;
						delete this.availSpies;
					};
				for (var tabId in spyTabs) {
					if (spyTabs.hasOwnProperty(tabId)) {
						var tab = tv.getTab(spyTabs[tabId]);
						var tabEl = Dom.get(tabId);
						tab.subscribe('beforeActiveChange', tabChange, tabEl, this);
						tabEl.elSpiesPane = Sel.query('.planetDetailSelectSpies', tabEl, true);
						tabEl.elSpyShipsPane = Sel.query('.planetDetailSelectSpyShip', tabEl, true);
						tabEl.elSendButton = Sel.query('.planetDetailSelectSpies button', tabEl, true);
						tabEl.elSpiesList = Sel.query('.planetDetailSpiesList', tabEl, true);
						tabEl.elSpyShipsList = Sel.query(".planetDetailSpyShipList", tabEl, true);
						tabEl.elMessage = Sel.query('.planetDetailSpiesMessage', tabEl, true);
						tabEl.elShipMessageCount = Sel.query('.planetDetailSpyShipMessage span.count', tabEl, true);
						Event.on(tabEl.elSendButton, "click", this.MoveSpies, tabEl, this);
						Event.on(
							Sel.query('.planetDetailSelectSpyShip button', tabEl, true),
							"click", this.MoveSpiesCancel, tabEl, this
						);
						Event.delegate(tabEl, "click", this.MoveSpyShip,
							".planetDetailSelectSpyShip ul button", this, true);
						this.planetDetails.hideEvent.subscribe(hideEventFn, tabEl, true);
					}
				}
				Event.on("planetDetailRenameSubmit", "click", this.Rename, this, true);
			}, this, true);
			this.planetDetails.hideEvent.subscribe(function(){
				this.planetDetails.resetDisplay(this);
			}, this, true);
			
			this.planetDetails.render();
			Game.OverlayManager.register(this.planetDetails);
		},
		_buildFindPanel : function() {
			var panelId = "starFind";
			
			var panel = document.createElement("div");
			panel.id = panelId;
			panel.innerHTML = ['<div class="hd">Find</div>',
				'<div class="bd">',
				'	<label for="',panelId,'Find">By Star Name:</label><input type="text" id="',panelId,'Find" />',
				'	<hr />',
				'	<div>',
				'		<label for="',panelId,'X">X:</label><input type="text" id="',panelId,'X" size="4" />',
				'		<label for="',panelId,'Y">Y:</label><input type="text" id="',panelId,'Y" size="4" />',
				'		<button type="button" id="',panelId,'Jump">Jump</button>',
				'	</div>',
				'</div>'].join('');
			document.body.insertBefore(panel, document.body.firstChild);
			Dom.addClass(panel, "nofooter");
			
			this.starFind = new YAHOO.widget.Panel(panelId, {
				constraintoviewport:true,
				visible:false,
				draggable:true,
				effect:Game.GetContainerEffect(),
				fixedcenter:false,
				close:false,
				underlay:false,
				width:"300px",
				zIndex:10005,
				context:["footer","bl","tl", ["beforeShow", "windowResize"], [0,-5]]
			});
			this.starFind.createFind = function() {
				var dataSource = new Util.XHRDataSource("/map");
				dataSource.connMethodPost = "POST";
				dataSource.maxCacheEntries = 2;
				dataSource.responseType = YAHOO.util.XHRDataSource.TYPE_JSON;
				dataSource.responseSchema = {
					resultsList : "result.stars",
					fields : ["name","color","x","y"]
				};
				
				var oTextboxList = new YAHOO.lacuna.TextboxList(this.findInput, dataSource, { //config options
					maxResultsDisplayed: 25,
					minQueryLength:3,
					multiSelect:false,
					forceSelection:false,
					useIndicator:true
				});
				oTextboxList.formatResult = function(oResultData, sQuery, sResultMatch) {
					return [
						'<div class="yui-gf">',
						'	<div class="yui-u first" style="background-color:black;">',
						'		<img src="',Lib.AssetUrl,'star_map/',oResultData.color,'.png" alt="',oResultData,name,'" style="width:50px;height:50px;" />',
						'	</div>',
						'	<div class="yui-u">',
						'		<div>',oResultData.name,'</div>',
						'		<div>',oResultData.x,' : ',oResultData.y,'</div>',
						'	</div>',
						'</div>'].join("");
				};
				oTextboxList.generateRequest = function(sQuery){				
					var s = Lang.JSON.stringify({
							"id": YAHOO.rpc.Service._requestId++,
							"method": "search_stars",
							"jsonrpc": "2.0",
							"params": [
								Game.GetSession(""),
								decodeURIComponent(sQuery)
							]
						});
					return s;
				};
				oTextboxList.dirtyEvent.subscribe(function(event, isDirty, oSelf){
					var star = this._oTblSingleSelection.Object;
					oSelf.X.value = star.x;
					oSelf.Y.value = star.y;
				},this);
				this.findStar = oTextboxList;
			};
			this.starFind.renderEvent.subscribe(function(){
				this.starFind.findInput = Dom.get(panelId+"Find");
				this.starFind.X = Dom.get(panelId+"X");
				this.starFind.Y = Dom.get(panelId+"Y");
				Event.on(panelId+"Jump", "click", this.FindJump, this, true);
				this.starFind.createFind();
			},this,true);
			
			this.starFind.render();
		},
		
		IsVisible : function() {
			return this._isVisible;
		},
		MapVisible : function(visible) {
			if(visible) {
				this.starFind.show();
			}
			else {
				this.starFind.hide();
			}
			if(this._isVisible != visible) {
				if(this._elGrid) {
					this._isVisible = visible;
					YAHOO.log(visible, "info", "MapStar.MapVisible");
					if(visible) {
						if(!Dom.inDocument(this._elGrid)) {
							document.getElementById("content").appendChild(this._elGrid);
						}
						//Dom.setStyle(this._elGrid, "display", visible ? "" : "none");
					}
					else {
						this._elGrid = this._elGrid.parentNode.removeChild(this._elGrid);
					}
					if (visible) {
						this.Resize();
					}
				}
			}
		},

		FindJump : function() {
			var x = this.starFind.X.value*1,
				y = this.starFind.Y.value*1;
				
			if(Lang.isNumber(x) && Lang.isNumber(y)) {
				this.Jump(x,y);
			}
		},
		Jump : function(xC,yC) {
			this.LoadGrid({
				x:xC, //(xC-1),
				y:yC //(yC+1)
			});
		},
		Load : function() {
			var cId = Game.GetCurrentPlanet().id;
			if(cId) {
				var loc = Game.EmpireData.planets[cId];
				if(loc) {
					this.locationId = cId;
					loc.x *= 1;
					loc.y *= 1;
					this.LoadGrid(loc);
				}
			}
		},
		LoadGrid : function(loc) {
			Lacuna.Pulser.Show();
			if(!this._gridCreated) {
				var starMap = document.createElement("div");
				starMap.id = "starMap";
				this._elGrid = document.getElementById("content").appendChild(starMap);
				this.SetSize();
								
				var map = new Lacuna.Mapper.StarMap("starMap");
				//map.imgUrlLoc = Lib.AssetUrl + 'ui/mapiator/';
				
				//draw what we got
				map.redraw();
				//move to current planet
				map.setCenterTo(loc.x,loc.y);
				
				this._map = map;
				this._gridCreated = true;
				
				Event.delegate(this._map.mapDiv, "click", this.GridClick, "div.tile", this, true);
			}
			else {
				//move to current planet
				this._map.setCenterTo(loc.x,loc.y);
			}
			
			this.MapVisible(true);
			Lacuna.Pulser.Hide();
		},
		GridClick : function(e, matchedEl, container) {
			if(!this._map.controller.isDragging()) {
				var tile = this._map.tileLayer.findTileById(matchedEl.id);
				if(tile && tile.data) {
					if(tile.data.isStar) {
						this.ShowStar(tile);
					}
					else if(tile.data.isPlanet) {
						this.ShowPlanet(tile);
					}
				}
			}
		},
		DetailsClick : function(e, matchedEl, container){
			if(this.selectedBody) {
				if(matchedEl.innerHTML == "View") {
					var id = this.selectedBody.id;
					this.planetDetails.hide();
					this.fireEvent("onChangeToPlanetView", id);
				}
			}
		},
		SetSize : function() {
			var size = Game.GetSize();
			Dom.setStyle(this._elGrid, "width", size.w+"px");
			Dom.setStyle(this._elGrid, "height", size.h+"px");
		},
		Resize : function() {
			this.SetSize();
			this._map.resize();
		},
		Reset : function() {
			delete this.locationId;
			if(this._map) {
				this._map.reset();
			}
			this.MapVisible(false);
		},
	
	
		CreateShipsIncomingTab : function(panel) {
			var ships = this.currentShips.incoming,
				elm = document.createElement("div"),
				c = elm.cloneNode(false),
				details = document.createElement("ul"),
				li = document.createElement("li");
			
			ships = ships.slice(0);
			ships.sort(function(a,b) {
				if (a.date_arrives > b.date_arrives) {
					return 1;
				}
				else if (a.date_arrives < b.date_arrives) {
					return -1;
				}
				else {
					return 0;
				}
			});

			details = elm.appendChild(c).appendChild(details);
			
			var now = new Date();
			
			for(var i=0; i<ships.length; i++) {
				var ship = ships[i],
					nLi = li.cloneNode(false),
					sec = (Lib.parseServerDate(ship.date_arrives).getTime() - now.getTime()) / 1000;
					
				nLi.Ship = ship;
				
				nLi.innerHTML = ['<div class="yui-gd" style="margin-bottom:2px;">',
				'	<div class="yui-u first" style="width:20%;background:transparent url(',Lib.AssetUrl,'star_system/field.png) no-repeat center;text-align:center;">',
				'		<img src="',Lib.AssetUrl,'ships/',ship.type,'.png" style="width:50px;height:50px;" />',
				'	</div>',
				'	<div class="yui-u" style="width:75%">',
				'		<div class="buildingName">[',ship.type_human,'] ',ship.name,' - Arrives in: <span class="shipArrives">',Lib.formatTime(sec),'</span></div>',
				'		<div><label style="font-weight:bold;">Details:</label>',
				'			<span><span>Task:</span><span>',ship.task,'</span></span>',
				'			<span><span>From:</span><span>',ship.from ? ship.from.name : 'Unknown','</span></span>',
				'			<span><span>To:</span><span>',ship.to.name,'</span></span>',
				'		</div>',
				'		<div><label style="font-weight:bold;">Attributes:</label>',
				'			<span>Speed:<span>',ship.speed,'</span></span>',
				'			<span>Hold Size:<span>',ship.hold_size,'</span></span>',
				'			<span>Stealth:<span>',ship.stealth,'</span></span>',
				'			<span>Combat:<span>',ship.combat,'</span></span>',
				'		</div>',
				'	</div>',
				'</div>'].join('');
				
				panel.addQueue(sec, this.ArrivesQueue, nLi);
				
				details.appendChild(nLi);
			}
						
			//wait for tab to display first
			setTimeout(function() {
				if(details.parentNode.clientHeight > 240) {
					Dom.setStyle(details.parentNode,"height","240px");
					Dom.setStyle(details.parentNode,"overflow-y","auto");
				}
			},10);
			
			panel.addTab(new YAHOO.widget.Tab({ label: "Incoming", contentEl:elm }));
		},
		ArrivesQueue : function(remaining, elLine){
			if(remaining <= 0) {
				elLine.parentNode.removeChild(elLine);
			}
			else {
				Sel.query(".shipArrives",elLine,true).innerHTML = Lib.formatTime(Math.round(remaining));
			}
		},
		
		PopulateShipsSendTab : function(panel) {
			var ships = this.currentShips.available,
				details = Dom.get(panel.isStarPanel ? "starDetailSendShips" : "planetDetailSendShips"),
				detailsParent = details.parentNode,
				li = document.createElement("li");
				
			Event.purgeElement(details); //clear any events before we remove
			details = detailsParent.removeChild(details); //remove from DOM to make this faster
			details.innerHTML = "";
			
			if(ships.length === 0) {
				details.innerHTML = "No available ships to send.";
			}
			else {
				for(var i=0; i<ships.length; i++) {
					var ship = ships[i],
						nLi = li.cloneNode(false);
						
					nLi.Ship = ship;
					nLi.innerHTML = ['<div class="yui-gd" style="margin-bottom:2px;">',
					'	<div class="yui-u first" style="width:15%;background:transparent url(',Lib.AssetUrl,'star_system/field.png) no-repeat center;text-align:center;">',
					'		<img src="',Lib.AssetUrl,'ships/',ship.type,'.png" style="width:60px;height:60px;" />',
					'	</div>',
					'	<div class="yui-u" style="width:67%">',
					'		<div class="buildingName">[',ship.type_human,'] ',ship.name,'</div>',
					'		<div><label style="font-weight:bold;">Details:</label>',
					'			<span>Task:<span>',ship.task,'</span></span>,',
					'			<span>Travel Time:<span>',Lib.formatTime(ship.estimated_travel_time),'</span></span>',
					'		</div>',
					'		<div><label style="font-weight:bold;">Attributes:</label>',
					'			<span>Speed:<span>',ship.speed,'</span></span>,',
					'			<span>Hold Size:<span>',ship.hold_size,'</span></span>,',
					'			<span>Stealth:<span>',ship.stealth,'</span></span>',
					'			<span>Combat:<span>',ship.combat,'</span></span>',
					'		</div>',
					'	</div>',
					'	<div class="yui-u" style="width:8%">',
					ship.task == "Docked" ? '		<button type="button">Send</button>' : '',
					'	</div>',
					'</div>'].join('');
					
					if(ship.task == "Docked") {
						Event.on(Sel.query("button", nLi, true), "click", this.ShipSend, {Self:this,Ship:ship,Line:nLi}, true);
					}
					
					details.appendChild(nLi);
				}
			}
			detailsParent.appendChild(details); //add back as child
							
			//wait for tab to display first
			setTimeout(function() {
				if(detailsParent.clientHeight > 240) {
					Dom.setStyle(detailsParent,"height","240px");
					Dom.setStyle(detailsParent,"overflow-y","auto");
				}
			},10);
		},
		ShipSend : function() {
			var oSelf = this.Self,
				ship = this.Ship,
				target, targetName, panel;
				
			if(oSelf.selectedBody) {
				target = {body_id : oSelf.selectedBody.id};
				targetName = oSelf.selectedBody.name;
				panel = oSelf.planetDetails;
			}
			else if(oSelf.selectedStar) {
				target = {star_id : oSelf.selectedStar.id};
				targetName = oSelf.selectedStar.name;
				panel = oSelf.starDetails;
			}
			
			if(target && oSelf.NotIsolationist(ship)) {
				Game.Services.Buildings.SpacePort.send_ship({
					session_id:Game.GetSession(),
					ship_id:ship.id,
					target:target
				}, {
					success : function(o){
						YAHOO.log(o, "info", "MapStar.ShipSend.send_ship.success");
						Lacuna.Pulser.Hide();
						this.Self.fireEvent("onMapRpc", o.result);
						this.Self.GetShips(panel, target);
						Event.purgeElement(this.Line);
						this.Line.innerHTML = "Successfully sent " + this.Ship.type_human + " to " + targetName + ".";
					},
					failure : function(o){
						YAHOO.log(o, "error", "MapStar.ShipSend.send_ship.failure");
						Lacuna.Pulser.Hide();
						this.Self.fireEvent("onMapRpcFailed", o);
					},
					timeout:Game.Timeout,
					scope:this
				});
			}
		},
		NotIsolationist : function(ship) {
			if(Game.EmpireData.is_isolationist == "1" && (ship.type == "colony_ship" || ship.type == "short_range_colony_ship")) {
				return confirm("If you colonize another planet you will no longer be considered an Isolationist and you will be open to attack.  Are you sure you want to do this?");
			}
			return true;
		},
	
		PopulateShipsUnavailTab : function(panel) {
			var ships = this.currentShips.unavailable,
				details = Dom.get(panel.isStarPanel ? "starDetailUnavailShips" : "planetDetailUnavailShips"),
				detailsParent = details.parentNode,
				li = document.createElement("li");
				
			Event.purgeElement(details); //clear any events before we remove
			details = detailsParent.removeChild(details); //remove from DOM to make this faster
			details.innerHTML = "";
			
			if(ships.length === 0) {
				details.innerHTML = "No unavailable ships.";
			}
			else {
				for(var i=0; i<ships.length; i++) {
					var ship = ships[i].ship,
						nLi = li.cloneNode(false);
						
					nLi.Ship = ship;
					nLi.innerHTML = ['<div class="yui-gd" style="margin-bottom:2px;">',
					'	<div class="yui-u first" style="width:20%;background:transparent url(',Lib.AssetUrl,'star_system/field.png) no-repeat center;text-align:center;">',
					'		<img src="',Lib.AssetUrl,'ships/',ship.type,'.png" style="width:50px;height:50px;" />',
					'	</div>',
					'	<div class="yui-u" style="width:75%">',
					'		<div class="buildingName">[',ship.type_human,'] ',ship.name,'</div>',
					'		<div><label style="font-weight:bold;">Details:</label>',
					'			<span><span>Task:</span><span>',ship.task,'</span></span>',
					'		</div>',
					'		<div><label style="font-weight:bold;">Attributes:</label>',
					'			<span>Speed:<span>',ship.speed,'</span></span>,',
					'			<span>Hold Size:<span>',ship.hold_size,'</span></span>,',
					'			<span>Stealth:<span>',ship.stealth,'</span></span>',
					'			<span>Combat:<span>',ship.combat,'</span></span>',
					'		</div>',
					'		<div style="font-style:italic;">',Lib.parseReason(ships[i].reason),'</div>',
					'	</div>',
					'</div>'].join('');
					
					details.appendChild(nLi);
				}
			}
			detailsParent.appendChild(details); //add back as child
			
			//wait for tab to display first
			setTimeout(function() {
				if(detailsParent.clientHeight > 240) {
					Dom.setStyle(detailsParent,"height","240px");
					Dom.setStyle(detailsParent,"overflow-y","auto");
				}
			},10);
			
		},
	
		CreateShipsMiningPlatforms : function(panel) {
			var ships = this.currentShips.mining_platforms,
				elm = document.createElement("div"),
				c = elm.cloneNode(false),
				details = elm.cloneNode(false);
				
			elm.innerHTML = [
				'<ul class="shipHeader clearafter">',
				'	<li class="shipName">From Empire</li>',
				'</ul>'
			].join('');
			
			details = elm.appendChild(c).appendChild(details);

			var ul = document.createElement("ul"),
				li = document.createElement("li");
			
			for(var i=0; i<ships.length; i++) {
				var ship = ships[i],
					nUl = ul.cloneNode(false),
					nLi = li.cloneNode(false);
					
				nUl.Ship = ship;
				Dom.addClass(nUl, "clearafter");
				
				nLi = li.cloneNode(false);
				Dom.addClass(nLi,"shipName");
				nLi.innerHTML = ship.empire_name;
				Event.on(nLi, "click", function(e, id){
					Lacuna.Info.Empire.Load(id);
				}, ship.empire_id);
				nUl.appendChild(nLi);
				
				details.appendChild(nUl);
			}
			
			//wait for tab to display first
			setTimeout(function() {
				if(details.parentNode.clientHeight > 240) {
					Dom.setStyle(details.parentNode,"height","240px");
					Dom.setStyle(details.parentNode,"overflow-y","auto");
				}
			},10);
			
			panel.addTab(new YAHOO.widget.Tab({ label: "Mining", contentEl:elm }));
		},
	
		GetShips : function(panel, target) {
			Lacuna.Pulser.Show();
			
			Game.Services.Buildings.SpacePort.get_ships_for({
				session_id:Game.GetSession(),
				from_body_id:Game.GetCurrentPlanet().id,
				target:target
			}, {
				success : function(o){
					YAHOO.log(o, "info", "MapStar.ShowStar.get_ships_for.success");
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpc", o.result);
					this.currentShips = o.result;

					this.PopulateShipsSendTab(panel);
					
					this.PopulateShipsUnavailTab(panel);

					panel.removeTabs(); //remove any tabs that are removable before adding new ones
					
					if(o.result.incoming && o.result.incoming.length > 0) {
						this.CreateShipsIncomingTab(panel);
					}
					
					if(o.result.mining_platforms && o.result.mining_platforms.length > 0) {
						this.CreateShipsMiningPlatforms(panel);
					}
					
					
					//select 0 index tab unless we already selected a different one
					if(panel.tabView.get("activeIndex") <= 0) {
						panel.tabView.selectTab(0);
					}

				},
				failure : function(o){
					YAHOO.log(o, "error", "MapStar.ShowStar.get_ships_for.failure");
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpcFailed", o);
				},
				timeout:Game.Timeout,
				scope:this
			});
			
		},
		ShowStar : function(tile) {
			//hide everything first so the hideEvents get run
			Game.OverlayManager.hideAllBut(this.starDetails.id);
			
			var data = tile.data,
				panel = this.starDetails;
				
			panel.resetDisplay(this);
			
			Dom.get("starDetailsImg").innerHTML = ['<img src="',Lib.AssetUrl,'star_map/',data.color,'.png" alt="',data.name,'" style="width:100px;height:100px;" />'].join('');
			
			Dom.get("starDetailsInfo").innerHTML = [
				'<ul>',
				'	<li id="starDetailsName">',data.name,'</li>',
				'	<li><label>X: </label>',data.x,'</li>',
				'	<li><label>Y: </label>',data.y,'</li>',
				'</ul>'
			].join('');
			
			this.selectedStar = data;
			
			this.GetShips(panel,{star_id:data.id});
			
			panel.show();
		},
		ShowPlanet : function(tile) {
			//hide everything first so the hideEvents get run
			Game.OverlayManager.hideAllBut(this.planetDetails.id);
			
			var body = tile.data,
				tab, tabs,
				panel = this.planetDetails,
				empire = body.empire || {alignment:"none", name:""};
				
			panel.resetDisplay(this);
			
			Dom.get("planetDetailsImg").innerHTML = ['<img src="',Lib.AssetUrl,'star_system/',body.image,'.png" alt="',body.name,'" style="width:200px;height:200px;" />'].join('');
			Dom.get("planetDetailsInfo").innerHTML = [
				'<ul>',
				'	<li id="planetDetailsName">',body.name,'</li>',
				'	<li><label>Type: </label>',body.type,'</li>',
				'	<li><label>Empire: </label><span id="planetDetailsEmpire">',empire.name,'</span></li>',
				empire.id ? ('<li><label>Isolationist: </label>'+(empire.is_isolationist=="1" ? 'Yes' : 'No')+'</li>') : '',
				'	<li><label>Water: </label>',body.water,'</li>',
				'	<li><label>Planet Size:</label>',body.size,'</li>',
				'	<li><label>Location in Universe:</label>',body.x,'x : ',body.y,'y</li>',
				'	<li><label>Star:</label>',body.star_name,'</li>',
				'	<li><label>Orbit:</label>',body.orbit,'</li>',
				empire.alignment == "self" ? '	<li><button type="button">View</button></li>' : '',
				'</ul>'
			].join('');
			
			Dom.get("planetDetailsAnthracite").innerHTML = body.ore.anthracite;
			Dom.get("planetDetailsBauxite").innerHTML = body.ore.bauxite;
			Dom.get("planetDetailsBeryl").innerHTML = body.ore.beryl;
			Dom.get("planetDetailsChalcopyrite").innerHTML = body.ore.chalcopyrite;
			Dom.get("planetDetailsChromite").innerHTML = body.ore.chromite;
			Dom.get("planetDetailsFluorite").innerHTML = body.ore.fluorite;
			Dom.get("planetDetailsGalena").innerHTML = body.ore.galena;
			Dom.get("planetDetailsGoethite").innerHTML = body.ore.goethite;
			Dom.get("planetDetailsGold").innerHTML = body.ore.gold;
			Dom.get("planetDetailsGypsum").innerHTML = body.ore.gypsum;
			Dom.get("planetDetailsHalite").innerHTML = body.ore.halite;
			Dom.get("planetDetailsKerogen").innerHTML = body.ore.kerogen;
			Dom.get("planetDetailsMagnetite").innerHTML = body.ore.magnetite;
			Dom.get("planetDetailsMethane").innerHTML = body.ore.methane;
			Dom.get("planetDetailsMonazite").innerHTML = body.ore.monazite;
			Dom.get("planetDetailsRutile").innerHTML = body.ore.rutile;
			Dom.get("planetDetailsSulfur").innerHTML = body.ore.sulfur;
			Dom.get("planetDetailsTrona").innerHTML = body.ore.trona;
			Dom.get("planetDetailsUraninite").innerHTML = body.ore.uraninite;
			Dom.get("planetDetailsZircon").innerHTML = body.ore.zircon;
			
			if(empire.id) {
				Dom.setStyle("planetDetailsEmpire", "cursor", "pointer");
				Dom.setStyle("planetDetailsEmpire", "text-decoration", "underline");
				Event.on("planetDetailsEmpire", "click", function(){
					Lacuna.Info.Empire.Load(this.id);
				}, empire, true);
			}
			else {
				Dom.setStyle("planetDetailsEmpire", "cursor", "normal");
				Dom.setStyle("planetDetailsEmpire", "text-decoration", "none");
				Event.removeListener("planetDetailsEmpire", "click");
			}
			
			if(empire.alignment == "self"){
				if(panel.renameTab) {
					panel.tabView.addTab(panel.renameTab, 1);
					delete panel.renameTab;
				}

				Dom.get("planetDetailNewName").value = "";
			}
			else {
				tabs = panel.tabView.get("tabs");
				for(var nt=0; nt<tabs.length; nt++) {
					tab = panel.tabView.getTab(nt);
					if(tab && tab.get("label") == this._renameLabel) {
						panel.renameTab = tab;
						panel.tabView.removeTab(tab);
						break;
					}
				}
			}
			if(empire.alignment == "none" || empire.is_isolationist == "1" ){
				tabs = panel.tabView.get("tabs");
				for(var snt = tabs.length; snt >= 0; snt--) {
					tab = panel.tabView.getTab(snt);
					if(tab && tab.get("label") == this._sendSpiesLabel) {
						panel.sendSpiesTab = tab;
						panel.tabView.removeTab(tab);
					}
					else if(tab && tab.get("label") == this._fetchSpiesLabel) {
						panel.fetchSpiesTab = tab;
						panel.tabView.removeTab(tab);
					}
				}
			}
			else {
				if(panel.sendSpiesTab) {
					panel.tabView.addTab(panel.sendSpiesTab);
					delete panel.sendSpiesTab;
				}
				if(panel.fetchSpiesTab) {
					panel.tabView.addTab(panel.fetchSpiesTab);
					delete panel.fetchSpiesTab;
				}
			}
			
			this.GetShips(panel,{body_id:body.id});
			
			this.selectedBody = body;
			this.selectedTile = tile;
			panel.tabView.selectTab(0);
			panel.show();
		},
		
		Rename : function() {
			var newName = Dom.get("planetDetailNewName").value;
			Game.Services.Body.rename({
					session_id: Game.GetSession(""),
					body_id:this.selectedBody.id,
					name:newName
				},{
					success : function(o){
						YAHOO.log(o, "info", "MapStar.Rename.success");
						if(o.result && this.selectedBody) {
							Dom.get("planetDetailRenameMessage").innerHTML = [
								"Successfully renamed your planet from ",
								this.selectedBody.name," to ", newName, '.'
							].join('');
							Lib.fadeOutElm("planetDetailRenameMessage");
							Dom.get("planetDetailsName").innerHTML = newName;
							Game.EmpireData.planets[this.selectedBody.id].name = newName;
							Lacuna.Menu.update();
							this._map.tileCache[this.selectedTile.x][this.selectedTile.y].name = newName;
							this.selectedTile.refresh();
							
							this.selectedBody.name = newName;
						}
					},
					failure : function(o){
						YAHOO.log(o, "error", "MapStar.Rename.failure");
						Dom.get("planetDetailRenameMessage").innerHTML = o.error.message;
						Lib.fadeOutElm("planetDetailRenameMessage");
					},
					timeout:Game.Timeout,
					scope:this
				}
			);
		},
		ShowSpies : function(tab) {
			Dom.setStyle(tab.elSpiesPane, 'display', 'block');
			Dom.setStyle(tab.elSpyShipsPane, 'display', 'none');
			if ( tab.availSpies && tab.availSpyShips ) {
				return;
			}
			tab.elSpiesList.innerHTML = "";
			tab.elSpyShipsList.innerHTML = "";
			tab.elMessage.innerHTML = "";
			Dom.setStyle(tab.elSendButton, 'display', 'none');
			var rpc_count = 0;
			Lacuna.Pulser.Show();
			var method;
			var data;
			if ( tab.id == 'planetDetailSendSpies' ) {
				method = 'prepare_send_spies';
				data = {
					session_id:Game.GetSession(),
					on_body_id:Game.GetCurrentPlanet().id,
					to_body_id:this.selectedBody.id
				};
			}
			else {
				method = 'prepare_fetch_spies';
				data = {
					session_id:Game.GetSession(),
					on_body_id:this.selectedBody.id,
					to_body_id:Game.GetCurrentPlanet().id
				};
			}

			Game.Services.Buildings.SpacePort[method](data,{
				success : function(o){
					YAHOO.log(o, "info", "MapStar.ShowSpies."+method+".success");
					this.fireEvent("onMapRpc", o.result);
					Lacuna.Pulser.Hide();
					tab.availSpyShips = o.result.ships;
					tab.availSpies = o.result.spies;
					this.populateSpies(tab);
				},
				failure : function(o){
					YAHOO.log(o, "error", "MapStar.ShowSpies."+method+".failure");
					this.fireEvent("onMapRpcFailed", o);
					Lacuna.Pulser.Hide();
				},
				timeout:Game.Timeout,
				scope:this
			});
		},
		populateSpies : function(tab) {
			var list = tab.elSpiesList;
			var spies = tab.availSpies;
			var ships = tab.availSpyShips;
			var verb = tab.id == 'planetDetailSendSpies' ? 'send' : 'fetch';
			
			if (spies.length == 0) {
				tab.elMessage.innerHTML = 'No spies available.';
				return;
			}
			var maxSpies = 0;
			for (var i = 0; i < ships.length; i++) {
				var ship = ships[i];
				if (ship.max_occupants > maxSpies) {
					maxSpies = ship.max_occupants;
				}
			}
			if (maxSpies == 0) {
				tab.elMessage.innerHTML = 'No ships available.';
			}
			else {
				tab.elMessage.innerHTML = 'Select up to ' + maxSpies + ' spies to ' + verb + ':';
				Dom.setStyle(tab.elSendButton, 'display', 'inline');
			}
			tab.maxSpies = maxSpies;
			
			var li = document.createElement('li');
			
			for (var si = 0; si < spies.length; si++) {
				var spy = spies[si],
					nLi = li.cloneNode(false);
				nLi.innerHTML = [
				'<div class="yui-gd" style="margin-bottom:2px;">',
				'	<div class="yui-u first description">',
				'		<div><strong>', spy.name, '</strong></div><div>Level ', spy.level,'</div>',
				'	</div>',
				'	<div class="yui-u">',
				maxSpies == 0 ? '' : '<input type="checkbox" name="spyId" value="'+spy.id+'" />',
				'		<div class="attributes"><span class="attribute">Offense: ', spy.offense_rating, '</span><span class="attribute">Defense: ',spy.defense_rating,'</span></div>',
				'	</div>',
				'</div>'
				].join('');
				list.appendChild(nLi);
			}
			
		},
		MoveSpies : function(e, tab) {
			Event.stopEvent(e);
			var spies = [];
			var ships = tab.availSpyShips;
			var list = tab.elSpyShipsList;
			var verb = tab.id == 'planetDetailSendSpies' ? 'send' : 'fetch';
			Dom.batch(tab.elSpiesList.getElementsByTagName('input'), function(el) {
				if (el.checked) {
					spies.push(el.value);
				}
			});
			if (spies.length == 0) {
				alert("You must select at least one spy to "+verb+"!");
				return;
			}
			if (spies.length > tab.maxSpies) {
				alert("You don't have any ships large enough to "+verb+" " + spies.length + " spies.");
				return;
			}

			tab.spiesToMove = spies;
			list.innerHTML = '';
			tab.elShipMessageCount.innerHTML = spies.length;

			var li = document.createElement('li');
			for (var i = 0; i < ships.length; i++) {
				var ship = ships[i];
				var usable = ship.max_occupants >= spies.length;
				var nLi = li.cloneNode(false);
				nLi.shipId = ship.id;
				nLi.innerHTML = [
				'<div class="yui-gd" style="margin-bottom:2px;">',
				'	<div class="yui-u first" style="width:20%;background:transparent url(',Lib.AssetUrl,'star_system/field.png) no-repeat center;text-align:center;">',
				'		<img src="',Lib.AssetUrl,'ships/',ship.type,'.png" style="width:50px;height:50px;" />',
				'	</div>',
				'	<div class="yui-u" style="width:78%">',
				usable ? '		<button type="button">'+verb.charAt(0).toUpperCase()+verb.slice(1)+' Spies</button>' : '',
				'		<div><strong>[',ship.type_human,'] ',ship.name,'</strong></div>',
				'		<div><strong>Attributes:</strong>',
				'			<span>Speed:<span>',ship.speed,'</span></span>',
				'			<span>Stealth:<span>',ship.stealth,'</span></span>',
				'			<span>Max Spies:<span>',ship.max_occupants,'</span></span>',
				'		</div>',
				'	</div>',
				'</div>'
				].join('');
				list.appendChild(nLi);
			}
			Dom.setStyle(tab.elSpiesPane, 'display', 'none');
			Dom.setStyle(tab.elSpyShipsPane, 'display', 'block');
		},
		MoveSpyShip : function(e, matchedEl, tab) {
			Event.stopEvent(e);
			Lacuna.Pulser.Show();
			var shipId = matchedEl.parentNode.parentNode.parentNode.shipId,
				spies = tab.spiesToMove,
				data = {
					session_id:Game.GetSession(),
					spy_ids:spies,
					ship_id:shipId
				},
				successMessage, method;
			if ( tab.id == 'planetDetailSendSpies' ) {
				successMessage = 'Spies sent!';
				method = Game.Services.Buildings.SpacePort.send_spies;
				data.on_body_id = Game.GetCurrentPlanet().id;
				data.to_body_id = this.selectedBody.id;
			}
			else {
				successMessage = 'Spies fetched!';
				method = Game.Services.Buildings.SpacePort.fetch_spies;
				data.on_body_id = this.selectedBody.id;
				data.to_body_id = Game.GetCurrentPlanet().id;
			}
			method(data, {
				success : function(o){
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpc", o.result);
					alert(successMessage + '  Arrival time: ' + Lib.formatServerDateShort(o.result.ship.date_arrives));
					delete tab.availSpies;
					delete tab.availSpyShips;
					this.ShowSpies(tab);
				},
				failure : function(o){
					Lacuna.Pulser.Hide();
					this.fireEvent("onMapRpcFailed", o);
				},
				timeout:Game.Timeout,
				scope:this
			});
		},
		MoveSpiesCancel : function(e, tab) {
			Event.stopEvent(e);
			Dom.setStyle(tab.elSpiesPane, 'display', 'block');
			Dom.setStyle(tab.elSpyShipsPane, 'display', 'none');
		}
	};
	Lang.augmentProto(MapStar, Util.EventProvider);
	
	Lacuna.MapStar = new MapStar();
})();
YAHOO.register("mapStar", YAHOO.lacuna.MapStar, {version: "1", build: "0"}); 

}
