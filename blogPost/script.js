//find grid container
const gridContainer = document.querySelector("#grid-container");

//create empty container for adding our html
let blogPostsHolder = ``;

//function to run on each element of our array
function addBlogPost(item, index) {
  console.log(item);
  console.log(index);
  blogPostsHolder += `
    <article>
         <h3>${item.title}</h3>
         <p>${item.content}</p>
    </article>`;
}

//run addBlogPost on eaqh item of array
blogPosts.forEach(addBlogPost);

//set my final innerHTML
gridContainer.innerHTML = blogPostsHolder;
