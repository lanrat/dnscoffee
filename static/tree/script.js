(function(){
    window.addEventListener("load", function(){
        // Collect DOM Elements
        let domainInput = document.getElementById("domainInput");
        let submitButton = document.getElementById("submitButton");

        // Config elements
        const hideIPs = document.getElementById("hideIPs");
        const hideNameservers = document.getElementById("hideNameservers");
        const accIPs = document.getElementById("accIPs");
        const accNameservers = document.getElementById("accNameservers");
        const matchColors = document.getElementById("matchColors");
        const configElements = [hideIPs,hideNameservers,accIPs,accNameservers,matchColors];
        let currentNodelist;
        // Display elements
        const treeOutput = document.getElementById("treeOutput");
        const meshOutput = document.getElementById("meshOutput");
        const svgToggleButton = [...document.getElementsByClassName("svgToggleButton")];
        const nodeCount = document.getElementById("nodeCount");
        const domainCount = document.getElementById("domainCount");
        const hazardCount = document.getElementById("hazardCount");
        const treeWrapper = document.getElementById("treeWrapper");
        const treeSpinner = document.getElementById("treeSpinner");
        const downloadSVG = document.getElementById("downloadSVG");
        const downloadSVGLink = document.createElement("a");
        const downloadGML = document.getElementById("downloadGML");
        const errorContent = document.getElementById("errorContent");
        // Track graph state
        let graphLoaded = false;
        let currentDomain = "";
        let currentView = "tree";
        // Toggle graph view
        svgToggleButton.forEach((button)=>{
            button.addEventListener("click",function(){
                svgToggleButton.forEach((b)=>{
                    b.classList.remove("active");
                });
                this.classList.add("active");
                if(this.id=="svgToggleMesh"){
                    treeOutput.style.display="none";
                    meshOutput.style.display="block";
                    currentView = "mesh";
                }else{
                    treeOutput.style.display="block";
                    meshOutput.style.display="none";
                    currentView = "tree";
                }
            })
        })
        // Change graph config
        configElements.forEach((element)=>{
            element.addEventListener("change",()=>{
                if(graphLoaded){
                    initNewGraph();
                    currentNodelist = currentNodelist.newListFromConfig(getOverrideMetadata(),updateOverview)
                    updateDisplay();
                }
            })
        })
        downloadSVG.addEventListener("click",()=>{
            if(graphLoaded){
                const container = (currentView=="tree")? treeOutput : meshOutput
                const svg = btoa(container.getElementsByTagName("svg")[0].outerHTML);
                const fileName = currentDomain.replace(/[\W_]+/g,"");
                downloadSVGLink.setAttribute("download",fileName+".svg");
                downloadSVGLink.setAttribute("href","data:image/svg+xml;base64,"+svg);
                downloadSVGLink.style.display="none";
                document.body.appendChild(downloadSVGLink);
                downloadSVGLink.click();
                document.body.removeChild(downloadSVGLink);
            }
        })
        submitButton.addEventListener("click", loadDomainGraph);
        domainInput.addEventListener("keyup",(event)=>{
            if(event.keyCode === 13) {
                event.preventDefault();
                loadDomainGraph();
            }
        })
        async function loadDomainGraph(){
            // Clear old output, show spinner
            initNewGraph();
            // Get domain input
            currentDomain = domainInput.value;
            // set url hash
            window.location.hash = "#" + encodeURIComponent(currentDomain);
            // Generate node list
            DNSResolutionGrapher.nodeListFromDomain(currentDomain,getOverrideMetadata(),updateOverview).then((nodeList)=>{
                // Create svg representation
                currentNodelist=nodeList;
                console.log(currentNodelist);
                updateDisplay();
            }).catch(error=>{
                console.log(error);
                // Hide spinner
                treeSpinner.classList.remove("active");
            });
        }
        function initNewGraph(){
            // Update graph state
            graphLoaded = false;
            // Clear old output content
            treeOutput.textContent='';
            meshOutput.textContent='';
            errorContent.textContent=''
            errorContent.classList.add("hidden");
            // Show tree content
            treeWrapper.classList.add("active");
            treeSpinner.classList.add("active");
            configElements.forEach((element)=>{
                element.disabled=true;
            })
        }
        function finishNewGraph(){
            // Hide spinner
            treeSpinner.classList.remove("active");
            configElements.forEach((element)=>{
                element.disabled=false;
            })
        }
        function getOverrideMetadata(){
            // Get nodelist config
            const accumulationNodes =[];
            if(accNameservers.checked){
                accumulationNodes.push("nameserver")
            }
            if(accIPs.checked){
                accumulationNodes.push("ip")
            }
            const hideNodes =[];
            if(hideNameservers.checked){
                hideNodes.push("nameserver")
            }
            if(hideIPs.checked){
                hideNodes.push("ip")
            }
            return {
                "accumulationNodes":accumulationNodes,
                "hideNodes":hideNodes,
                "matchBranchColors":matchColors.checked,
            }
        }
        function updateOverview(overview){
             // Callback for onUpdate
            const numVisible = (overview.visible || new Set()).size;
            const numDomain = (overview.domain || new Set()).size;
            const numHazard = (overview.hazard || new Set()).size;
            nodeCount.textContent = numVisible+ " node" + ((numVisible!=1) ? "s" : "");
            domainCount.textContent = numDomain+ " domain" + ((numDomain!=1) ? "s" : "");
            hazardCount.textContent = numHazard+ " hazard" + ((numHazard!=1) ? "s" : "");
            // Print error info
            errorContent.textContent=''
            errorContent.classList.remove("hidden");
            (overview.errorCodes || new Set()).forEach((error)=>{
                const column = document.createElement("div");
                column.classList.add("col-12")
                column.classList.add("col-lg-6")
                column.classList.add("col-xl-4")

                const errorMessage = document.createElement("div");
                errorMessage.classList.add("error-message");

                const messageBody = document.createElement("div");
                messageBody.classList.add("message-body");

                const messageHeading = document.createElement("div");
                messageHeading.classList.add("message-heading");
                messageHeading.textContent = errorCodes[error].message;
                messageHeading.classList.add(errorCodes[error].type);

                const messageExplanation = document.createElement("div");
                messageExplanation.classList.add("message-explanation");
                messageExplanation.textContent = errorCodes[error].explanation;

                messageBody.appendChild(messageHeading)
                messageBody.appendChild(messageExplanation)
                errorMessage.appendChild(messageBody);
                column.appendChild(errorMessage);
                errorContent.appendChild(column)
            })
        }
        function updateDisplay(){
            DNSResolutionGrapher.svgFromNodeList(currentNodelist,"#treeOutput","tree");
            DNSResolutionGrapher.svgFromNodeList(currentNodelist,"#meshOutput","mesh");
            // Show toggle buttons
            svgToggleButton.forEach((button)=>{button.classList.add("show")});
            // Create GraphML String
            const gmlString = DNSResolutionGrapher.graphMLStringFromNodeList(currentNodelist);
            // Update graph state
            graphLoaded = true;
            const fileName = currentDomain.replace(/[\W_]+/g,"");
            downloadGML.setAttribute("download",fileName+".graphml");
            downloadGML.setAttribute("href","data:text/xml;base64,"+btoa(gmlString));
            finishNewGraph();
        }
        if (document.location.hash != "") {
            domainInput.value = decodeURIComponent(window.location.hash.substring(1));
            loadDomainGraph();
        }
    });              
})();