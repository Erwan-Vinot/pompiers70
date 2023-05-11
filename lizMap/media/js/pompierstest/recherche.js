 // Définir dictioAdresse en variable à portée globale
 let dictioAdresse = [];

 // charger le .CSV produit par le projet FME avec une requette html sur Lizmap
 fetch("http://127.0.0.1:8090/index.php/view/media/getMedia?repository=pompierstest&project=pompierstest&mtime=1682859345&path=media/js/pompierstest/csv/AdressesTempsInter.csv")
 	.then(response => response.text()) // transformation de la réponse en texte
 	.then(csvData => {
 		const rows = csvData.trim().split('\n'); // création des lignes à chaque retour en arrière 
 		const header = rows.shift().split(','); // création des noms de champs/ colonnes à chaque virgule de la première ligne
 		const jsonData = rows.map(row => { // boucle sur les lignes restantes dans "rows" et transforme chaque ligne en un objet JavaScript (jsonData)
 			const values = row.split(',');
 			return header.reduce((obj, key, index) => {
 				obj[key] = values[index];
 				return obj;
 			}, {});
 		});
 		dictioAdresse = jsonData.map(r => { // création d'un dictionnaire pour accéder aux adresses, r = row = ligne
 			const dictioAdresse = {
				// concaténation d'attributs pour faire une adresse complète dans un champ "adresse" et // supprimer les ' " ' autour des chiffres ajoutés par response.text()
 				"adresse": [r.numero, r.rep, r.nom_1, r.code_post, r.nom_com].join(" ").replace(/"/g, ''), 
 			};
 			Object.entries(r).forEach(function(champ) {
				// ne stocker que les valeurs qui sont différentes des champs concaténés (ne garder que le nouveau champ adresse, pas ses champs composants)
 				if (!["numero", "rep", "nom_1", "code_post", "nom_com", "code_insee"].includes(champ[0])) { 
 					dictioAdresse[champ[0]] = champ[1];
 				}
 			});
 			return dictioAdresse;
 		});
 		// console.log(dictioAdresse);   // pour débug, process lourd
 		// utilisation du nouveau champ "adresse" pour l'autocomplétion
 		const autocompleteSource = dictioAdresse.map(obj => obj.adresse);
 		// ajout de l'autocompletion sur la barre de recherche
 		$('#barre-recherche').autocomplete({
 			source: autocompleteSource,
 			minLength: 3,
 			//select: function(event, ui) {               // essai submit -- fait planter LizMap -- pas besoin finalement
 			//$('#form').submit();
 			//}
 		});
 	})
 	.catch(error => console.error(error)); // si erreur, la log dans la console

 lizMap.events.on({
 	'uicreated': function(evt) { // nécessaire pour ajouter des éléments HTML à l'interface LizMap
 		// création de la barre et du bouton de rechercher en HTML
 		var html = '<form id="form"><label>Adresse: <input type="text" id="barre-recherche"/></label><br /><br /><button type="submit" id="submit-btn">Rechercher</button></form><p id="log"></p>';
 		$('#map-content').append(html); //ajout du code HTML
 		$('#form') //style
 			.css('position', 'absolute')
 			.css('top', '30px')
 			.css('z-index', '1000')
 			.css('margin-left', 'calc(50% - 80px)'); // centré en prenant en compte la barre latérales

		$('#submit-btn')
			.css('display', 'block')
			.css('margin', '-30px auto 0');

 		// ajout d'un event listener pour la recherche
 		$('#submit-btn').click(function(e) {
 			e.preventDefault(); // éviter de lancer la recherche de façon intempestive
 			var inputValue = $('#barre-recherche').val(); // récuperer la valeur de la barre
 			console.log('Adresse recherchée : ', inputValue); // debug console

 			// recherche dans le dictionnaire pour faire match = correspondre le contenu de la barre et le contenu du champ "adresse"
 			var matchingObject = dictioAdresse.find(obj => obj.adresse === inputValue);

 			// si il y a match, le montrer dans la console avec son id 
 			if (matchingObject) {
 				console.log('Correspondance touvée :', matchingObject);
 				console.log('id :', matchingObject.id_0);
 				// ne garder que la ligne corresondante à l'ID de l'adresse matchée
 				adresseTmp = dictioAdresse.filter(row => row.id_0 == matchingObject.id_0)
 				console.log(adresseTmp)

 				function getResponseTimes(adresseTmp) {
 					let tableauResultat = [];
 					Object.entries(adresseTmp[0]).forEach(function(champ) {
 						// Parcourir toutes les propriétés des fonctionnalités pour trouver celles contenant des temps de réponse
 						if (champ[0].endsWith("_MIN_VOITURE") || champ[0].endsWith("_MIN_CAMION")) { // ne prendre que les champs de temps de trajet
 							// extraire le nom de la caserne et le type de véhicule à partir du nom de la propriété
 							var parts = champ[0].split("_"); // couper le nom à chaque underscore VESOUL_MIN_VOITURE et faire des valeurs avec.
 							var caserne = parts[0];
 							var vehicule = parts[2];
 							var tempsDeReponse = champ[1].replace(/"/g, ''); // supprimer les ' " ' autour des chiffres ajoutés par response.text()
 							// var tempsDeReponse = parseInt(champ[1]==""? "60+":champ[1]).replace(/"/g, '') ;

 							if (tempsDeReponse !== "") { // ne montrer que les temps de trajet non vides (plus de 60 minutes)
 								tableauResultat.push({
 									"Caserne": caserne,
 									"Temps": tempsDeReponse,
 									"Vehicule": vehicule
 								}); // inserer les champs/ attributs
 							}
 						}
 					});
 					tableauResultat.sort((a, b) => {// tri du temps de trajet le plus court à plus long dans le tableau
 						return a.Temps - b.Temps
 					}) 
 					console.log("Caserne non affichée = Plus d'une heure de trajet"); //indication
 					console.log(tableauResultat); // log du tableau en attendant de produire une interface HTML.
 					showPopup(tableauResultat,matchingObject.id_0);
					return tableauResultat;
 				}

				// fonction de création du tableau html
				function generateTable(data) {
					let headers = Object.keys(data[0]); // création des titres de colonne avec la première ligne
					let rows = data.map(row => Object.values(row)); //création des lignes avec les données 
				  
					let html = '<table style="border-collapse: collapse; width: 100%; margin: 0; padding: 0; font-family: sans-serif; font-size: 14px;">';
					html += '<thead style="background-color: #f2f2f2;">';
					headers.forEach(header => {
					  html += '<th style="border: 1px solid #ddd; text-align: left; padding: 8px;">' + header + '</th>';
					});
					html += '</thead>';
					html += '<tbody>';
					rows.forEach(row => {
					  html += '<tr>';
					  row.forEach(cell => {
						html += '<td style="border: 1px solid #ddd; text-align: left; padding: 8px;">' + cell + '</td>';
					  });
					  html += '</tr>';
					});
					html += '</tbody></table>';
					return html;
				}
				//
				function showPopup(data,popupID) { // Ajout d'un ID pour faire une nouvelle fenêtre à chaque recherche
					let tableHtml = generateTable(data);
					let popup = window.open("", popupID, "width=800,height=600"); 
					popup.document.write(`
					  <html>
						<head>
						  <title>Temps de trajet des casernes à l'adresse ${inputValue}</title>
						  <style>
							body {
							  font-family: Arial, sans-serif;
							  background-color: #f7f7f7;
							  padding: 20px;
							}
							.container {
							  display: flex;
							  flex-direction: row;
							  align-items: center;
							  justify-content: space-between;
							  margin-bottom: 20px;
							}
							table {
							  border-collapse: collapse;
							  width: 100%;
							  margin-bottom: 20px;
							}
							th, td {
							  border: 1px solid #dddddd;
							  text-align: left;
							  padding: 8px;
							}
							th {
							  background-color: #dddddd;
							  font-weight: bold;
							}
							h1 {
							  font-size: 24px;
							  margin: 0;
							  color: #333333;
							}
							button {
							  background-color: #4CAF50; /* Green */
							  border: none;
							  color: white;
							  padding: 10px 16px;
							  text-align: center;
							  text-decoration: none;
							  display: inline-block;
							  font-size: 14px;
							  cursor: pointer;
							}
						  </style>
						</head>
						<body>
						  <div class="container">
							<h1>Temps de trajet des casernes à l'adresse ${inputValue}</h1>
							<button id="download-btn">Download CSV</button>
						  </div>
						  ${tableHtml} 
						  </p>
						  Caserne non affichée = Plus d'une heure de trajet
						  <script>
							const csvData = ${JSON.stringify(data)};
							const downloadBtn = document.getElementById("download-btn");
							downloadBtn.addEventListener("click", () => {
							  const csvContent = "data:text/csv;charset=utf-8," 
								+ "Caserne,Temps,Vehicule\\n"
								+ csvData.map(e => Object.values(e).join(",")).join("\\n");
							  const encodedUri = encodeURI(csvContent);
							  const link = document.createElement("a");
							  link.setAttribute("href", encodedUri);
							  link.setAttribute("download", "${inputValue}.csv");
							  document.body.appendChild(link);
							  link.click();
							});
						  </script>
						</body>
					  </html>
					`);
				}
 				getResponseTimes(adresseTmp);
 			} else {
 				alert('Pas de correspondace trouvée.');
 			}
 		});
 	}
 });