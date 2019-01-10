Date.prototype.yyyymmdd = function() {
    var mm = this.getMonth() + 1; // getMonth() is zero-based
    var dd = this.getDate();
  
    return [
            (mm>9 ? '' : '0') + mm,
            (dd>9 ? '' : '0') + dd,
            this.getFullYear(),
           ].join('');
  };

let app = angular
    .module('csvToList',['ui.bootstrap']);

app.directive("selectNgFiles", function() {
        return {
          require: "ngModel",
          link: function postLink(scope,elem,attrs,ngModel) {
            elem.on("change", function(e) {
              let files = elem[0].files,
                file = null;
              if(files.length > 0) {
                  file = files[0];
              }
              ngModel.$setViewValue(file);
            })
          }
        }
      });

function stripHtml(html){
    var doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
 }

app.filter('stripHtml', function() {
    return function(input) {
        if (!input) return input;
        return stripHtml(input).trim();
    };
});


app.controller('appController', function($scope) {
    $scope.csvFile = null;
    $scope.csvData = null;
    $scope.csvFileLoaded = false;

    $scope.skipEmptyCells = false;
    $scope.stripHtml = false;


    $scope.showLoader = false;

    $scope.headers = [];
    let selectedHeaders = [];

    // when csv file is changed
    $scope.$watch('csvFile', function(file) {

        $scope.headers = [];
        selectedHeaders = [];
        $scope.csvData = null;
        $scope.csvFileLoaded = false;

        if(file != null) {
            console.log("Reading csv file...");
            $scope.showLoader = true;

            Papa.parse(file, {
                header: true,
                complete: function(results) {

                    console.log("Finished:", results);

                    let data = results.data;

                    let headers = Object.keys(data[0]);
                    console.log("Headers: ", headers);

                    $scope.headers = headers;

                    $scope.csvData = data;
                    
                    $scope.csvFileLoaded = true;

                    $scope.showLoader = false;

                    $scope.$apply();
                }
            });

        }

    });

    $scope.toggleSelectedHeader = function(name) {
        if(selectedHeaders.includes(name)) {
            selectedHeaders = selectedHeaders.filter(h => h !== name);
        } else {
            selectedHeaders.push(name);
        }
    }

    $scope.headerIsSelected = function(name) {
        return selectedHeaders.includes(name);
    }

    $scope.hasOneHeaderSelected = function() {
        return selectedHeaders.length > 0;
    }

    $scope.getSelectedFileName = function() {
        if($scope.csvFileLoaded && $scope.csvFile) {
            return $scope.csvFile.name;
        }
        return "";
    }

    $scope.convertCsv = function() {

        if($scope.csvFileLoaded && $scope.csvData && selectedHeaders.length > 0) {

            $scope.showLoader = true;

            let doc = new Document();
            

            let entryCount = 0;
            for(let row of $scope.csvData) {

                let paragraph = new Paragraph();

                for (const [key, value] of Object.entries(row)) {

                    if(!selectedHeaders.includes(key)) continue;

                    if($scope.skipEmptyCells && value == null || value.trim().length < 1) continue;
                    
                    let header = key, cell = value;
                    if($scope.stripHtml) {
                        header = stripHtml(header).trim();
                        cell = stripHtml(cell).trim();
                    }
                    let textRun = new TextRun(`${header}: ${cell}`);

                    if(entryCount !== 0) {
                        textRun = textRun.break();
                    }

                    paragraph.addRun(textRun);

                    entryCount++;
                }

                doc.addParagraph(paragraph);            
            }

            const packer = new Packer();

            packer.toBlob(doc).then(blob => {

                $scope.showLoader = false;
                $scope.$apply();

                let dateStr = new Date().yyyymmdd();

                saveAs(blob, `csvtolist-${dateStr}.docx`);

                console.log("Document created successfully");
            });
        }

    };
});
