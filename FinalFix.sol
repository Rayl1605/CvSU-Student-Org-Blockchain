// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract OrganizationRegistry {
    
    address public owner;

    struct Organization {
        string ticker;
        string name;
        address adminAddress;
        string financialsLink;
        string acknowledgementLink;
        string orgFlowLink;
        string executivesLink;
        bool isRegistered;
        bool isVerified; // 🔒 NEW: Verification Status
    }

    mapping(string => Organization) public organizations; 
    mapping(address => string) public adminToTicker;      
    string[] public registeredTickers;

    constructor() {
        owner = msg.sender; // The wallet that deploys this is the Admin
    }

    modifier onlyAdmin() {
        require(msg.sender == owner, "Only Admin can perform this action");
        _;
    }

    function registerOrg(string memory _t, string memory _n) public {
        require(bytes(_t).length > 0, "Ticker required");
        require(!organizations[_t].isRegistered, "Ticker taken");
        require(bytes(adminToTicker[msg.sender]).length == 0, "Wallet already owns an Org");

        // Set isVerified to FALSE by default (Pending Approval)
        organizations[_t] = Organization(_t, _n, msg.sender, "", "", "", "", true, false);
        adminToTicker[msg.sender] = _t;
        registeredTickers.push(_t);
    }

    // 🔒 NEW: Only Admin can call this to approve an Org
    function approveOrg(string memory _t) public onlyAdmin {
        require(organizations[_t].isRegistered, "Org not found");
        organizations[_t].isVerified = true;
    }

    function getMyOrgTicker() public view returns (string memory) {
        return adminToTicker[msg.sender];
    }

    function uploadDoc(string memory _t, string memory _l, uint8 _type) public {
        require(organizations[_t].isRegistered, "Org not found");
        // Check if Verified before allowing upload
        require(organizations[_t].isVerified, "Organization is not verified yet!"); 
        require(organizations[_t].adminAddress == msg.sender, "Only Admin can upload");

        if (_type == 1) organizations[_t].financialsLink = _l;
        else if (_type == 2) organizations[_t].acknowledgementLink = _l;
        else if (_type == 3) organizations[_t].orgFlowLink = _l;
        else if (_type == 4) organizations[_t].executivesLink = _l;
    }

    function getAllTickers() public view returns (string[] memory) {
        return registeredTickers;
    }

    function getOrgDetails(string memory _t) public view returns (
        string memory ticker,
        string memory name,
        address wallet,
        string memory financial,
        string memory ack,
        string memory flow,
        string memory execs,
        bool verified // Return verification status
    ) {
        Organization memory o = organizations[_t];
        return (o.ticker, o.name, o.adminAddress, o.financialsLink, o.acknowledgementLink, o.orgFlowLink, o.executivesLink, o.isVerified);
    }
}