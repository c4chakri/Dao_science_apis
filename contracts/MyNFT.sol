// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {ERC721Pausable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MobiusNFT721 is
    ERC721,
    ERC721URIStorage,
    Ownable,
    ERC721Pausable,
    ERC721Burnable
{
    // Mapping for token-specific URIs
    mapping(uint256 => string) private _tokenURIs;

    // Counter for unique NFT token IDs
    uint256 private _nftTokenID;

    // Struct for sale listings
    struct SaleListing {
        address seller;
        uint256 price;
    }

    // Struct for auction listings
    struct Auction {
        address seller;
        uint256 tokenId;
        uint256 startingPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool ended;
    }

    // Mappings for listings and auctions
    mapping(uint256 => SaleListing) public listings;
    mapping(uint256 => Auction) public auctions;
    mapping(address => bool) public blacklisted;
    
    uint256 public auctionCounter;

    event NFTMinted(address indexed to, uint256 tokenId, string tokenURI);
    event NFTListed(address indexed seller, uint256 tokenId, uint256 price);
    event NFTListingRemoved(address indexed seller, uint256 tokenId);
    event NFTBought(
        address indexed buyer,
        address indexed seller,
        uint256 tokenId,
        uint256 price
    );
    event AuctionStarted(
        address indexed seller,
        uint256 auctionId,
        uint256 tokenId,
        uint256 startingPrice,
        uint256 endTime
    );
    event BidPlaced(address indexed bidder, uint256 auctionId, uint256 amount);
    event AuctionEnded(
        address indexed seller,
        address indexed winner,
        uint256 auctionId,
        uint256 tokenId,
        uint256 finalPrice
    );
    event AddedToBlacklist(address indexed user);
    event RemovedFromBlacklist(address indexed user);

    /**
     * @notice Constructor initializes the contract with name and symbol.
     * @param initialOwner Address of the initial owner
     * @param tokenName Name of the NFT token
     * @param tokenSymbol Symbol of the NFT token
     */
    constructor(
        address initialOwner,
        string memory tokenName,
        string memory tokenSymbol
    ) ERC721(tokenName, tokenSymbol) Ownable(initialOwner) {
        transferOwnership(initialOwner);
    }
    
    /**
    * @notice Pauses all token transfers.
    */
    function pause() public onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpauses all token transfers.
     */
    function unpause() public onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Mints a new NFT.
     * @param to Address receiving the minted NFT
     * @param _tokenURI Metadata URI of the NFT
     */
    function mintNFT(
        address to,
        string memory _tokenURI
    ) external whenNotPaused onlyOwner {
        require(bytes(_tokenURI).length > 0, "URI cannot be empty");
        require(!blacklisted[to], "Recipient is blacklisted");

        uint32 size;
        assembly {
            size := extcodesize(to)
        }
        require(size == 0, "Cannot be a contract");

        _nftTokenID++;
        _safeMint(to, _nftTokenID);
        _setTokenURI(_nftTokenID, _tokenURI);
        emit NFTMinted(to, _nftTokenID, _tokenURI);
    }

    /**
     * @notice Lists an NFT for sale.
     * @param tokenId The ID of the NFT to list
     * @param price Sale price of the NFT
     */
    function listForSale(
        uint256 tokenId,
        uint256 price
    ) external whenNotPaused {
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        require(!blacklisted[msg.sender], "Owner is blacklisted");
        require(price > 0, "Price must be greater than 0");

        listings[tokenId] = SaleListing({seller: msg.sender, price: price});

        // Transfer the NFT to the contract
        _transfer(msg.sender, address(this), tokenId);
        emit NFTListed(msg.sender, tokenId, price);
    }
    
    /**
     * @notice Buys an NFT that is listed for sale.
     * @param tokenId The ID of the NFT to buy
     */
    function buyNFT(uint256 tokenId) external payable whenNotPaused {
        SaleListing storage listing = listings[tokenId];
        require(!blacklisted[msg.sender], "Buyer is blacklisted");
        require(listing.seller != address(0), "Token is not listed for sale");
        require(msg.value == listing.price, "Incorrect payment amount");

        address seller = listing.seller;
        payable(seller).transfer(msg.value);
        delete listings[tokenId];

        _transfer(address(this), msg.sender, tokenId);
        emit NFTBought(msg.sender, seller, tokenId, msg.value);
    }
    
    /**
     * @notice Removes an NFT listing.
     * @param tokenId The ID of the NFT listing to remove
     */
    function removeListing(uint256 tokenId) external whenNotPaused {
        require(
            listings[tokenId].seller == msg.sender,
            "You are not the seller"
        );
        delete listings[tokenId];

        _transfer(address(this), msg.sender, tokenId);
        emit NFTListingRemoved(msg.sender, tokenId);
    }
    
    /**
     * @notice Retrieves all NFTs listed for sale.
     * @return Arrays containing token IDs, seller addresses, and prices
     */
    function getSaleListings()
        external
        view
        returns (uint256[] memory, address[] memory, uint256[] memory)
    {
        uint256 listedCount = 0;
        uint256 totalTokens = _nftTokenID;

        // Count the number of listed tokens
        for (uint256 i = 1; i <= totalTokens; i++) {
            if (listings[i].seller != address(0)) {
                listedCount++;
            }
        }

        // Create arrays for the result
        uint256[] memory tokenIds = new uint256[](listedCount);
        address[] memory sellers = new address[](listedCount);
        uint256[] memory prices = new uint256[](listedCount);

        uint256 index = 0;

        // Populate the result arrays
        for (uint256 i = 1; i <= totalTokens; i++) {
            if (listings[i].seller != address(0)) {
                tokenIds[index] = i;
                sellers[index] = listings[i].seller;
                prices[index] = listings[i].price;
                index++;
            }
        }

        return (tokenIds, sellers, prices);
    }

    /**
     * @notice Retrieves all NFTs owned by a specific user.
     * @param user The address of the user
     * @return An array of token IDs owned by the user
     */
    function getUserNFTs(
        address user
    ) external view returns (uint256[] memory) {
        uint256 totalTokens = _nftTokenID; // Get the total number of minted NFTs
        uint256[] memory userTokens = new uint256[](totalTokens);
        uint256 count = 0;

        for (uint256 tokenId = 1; tokenId <= totalTokens; tokenId++) {
            if (ownerOf(tokenId) == user) {
                userTokens[count] = tokenId;
                count++;
            }
        }

        // Resize the array to fit the actual number of tokens owned
        uint256[] memory ownedTokens = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            ownedTokens[i] = userTokens[i];
        }

        return ownedTokens;
    }
    
    /**
     * @notice Retrieves all NFTs listed for sale by a specific user.
     * @param user The address of the user
     * @return An array of token IDs listed for sale by the user
     */
    function getUserListedNFTs(
        address user
    ) external view returns (uint256[] memory) {
        uint256 totalTokens = _nftTokenID;
        uint256[] memory userListedTokens = new uint256[](totalTokens);
        uint256 count = 0;

        for (uint256 tokenId = 1; tokenId <= totalTokens; tokenId++) {
            if (listings[tokenId].seller == user) {
                userListedTokens[count] = tokenId;
                count++;
            }
        }

        uint256[] memory listedTokens = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            listedTokens[i] = userListedTokens[i];
        }

        return listedTokens;
    }
    
    /**
     * @notice Starts an auction for a given NFT.
     * @param tokenId The ID of the token to be auctioned
     * @param startingPrice The minimum bid amount
     * @param duration The duration of the auction in seconds
     */
    function startAuction(
        uint256 tokenId,
        uint256 startingPrice,
        uint256 duration
    ) external whenNotPaused {
        require(ownerOf(tokenId) == msg.sender, "You are not the owner");
        require(!blacklisted[msg.sender], "Owner is blacklisted");
        require(startingPrice > 0, "Starting price must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");

        auctionCounter++;

        auctions[auctionCounter] = Auction({
            seller: msg.sender,
            tokenId: tokenId,
            startingPrice: startingPrice,
            highestBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + duration,
            ended: false
        });

        _transfer(msg.sender, address(this), tokenId);
        emit AuctionStarted(
            msg.sender,
            auctionCounter,
            tokenId,
            startingPrice,
            block.timestamp + duration
        );
    }
    
    /**
     * @notice Bids for the purchase of the nFT that are on Auction for sale.
     * @param auctionId The ID of the auction to Place Bid.
     */
    function placeBid(uint256 auctionId) external payable whenNotPaused {
        Auction storage auction = auctions[auctionId];

        require(!blacklisted[msg.sender], "You are blacklisted");
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(
            msg.value > auction.highestBid,
            "Bid must be higher than the current highest bid"
        );
        require(
            msg.value > auction.startingPrice,
            "Bid must be higher than the starting price"
        );
        require(!auction.ended, "Auction already ended");

        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;
        emit BidPlaced(msg.sender, auctionId, msg.value);
    }
    
    /**
     * @notice Ends an auction and transfers the NFT to the highest bidder.
     * @param auctionId The ID of the auction to end
     */
    function endAuction(uint256 auctionId) external whenNotPaused {
        Auction storage auction = auctions[auctionId];

        require(block.timestamp >= auction.endTime, "Auction is still ongoing");
        require(!auction.ended, "Auction already ended");

        auction.ended = true;

        if (auction.highestBidder != address(0)) {
            _transfer(address(this), auction.highestBidder, auction.tokenId);
            payable(auction.seller).transfer(auction.highestBid);
        } else {
            _transfer(address(this), auction.seller, auction.tokenId);
        }
        emit AuctionEnded(
            auction.seller,
            address(0),
            auctionId,
            auction.tokenId,
            0
        );
    }
    
    /**
     * @notice Fetches the metadata URI of a given token ID.
     * @param tokenId The ID of the token
     * @return The metadata URI
     */
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @notice Adds a user to the blacklist.
     * @param user The address to blacklist
     */
    function addToBlacklist(address user) external onlyOwner {
        require(!blacklisted[user], "Address is already blacklisted");
        blacklisted[user] = true;
        emit AddedToBlacklist(user);
    }
    
    /**
     * @notice Removes a user from the blacklist.
     * @param user The address to remove from the blacklist
     */
    function removeFromBlacklist(address user) external onlyOwner {
        require(blacklisted[user], "Address is not blacklisted");
        blacklisted[user] = false;
        emit RemovedFromBlacklist(user);
    }

    /**
     * @notice Internal function to handle token updates and transfers.
     * @param to The recipient of the token
     * @param tokenId The ID of the token being updated
     * @param auth The address authorizing the update
     * @return The address of the previous owner
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Pausable) returns (address) {
        return ERC721._update(to, tokenId, auth);
    }
    
    /**
     * @notice Checks if the contract supports a given interface.
     * @param interfaceId The interface identifier
     * @return True if the interface is supported, false otherwise
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
